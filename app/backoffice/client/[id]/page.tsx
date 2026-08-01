"use client";

import React, { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { TopNav } from '../../../components/layout/TopNav';
import { Footer } from '../../../components/layout/Footer';
import { Button } from '../../../components/ui/button';
import { Card, CardContent } from '../../../components/ui/card';
import { maskMobile, maskEmail, formatDate } from '../../../lib/formatters';
import { computeClientMetrics, ClientMetrics } from '../../../lib/clientCalculations';
import { PortfolioRow, PortfolioMetrics } from '../../../lib/types';
import ClientKPICards from '../../../components/portfolio/ClientKPICards';
import { RunningROIChart } from '../../../components/portfolio/RunningROIChart';
import { DailyReturnChart } from '../../../components/portfolio/DailyReturnChart';
import { NetMTMChart } from '../../../components/portfolio/NetMTMChart';
import { ReturnDistribution } from '../../../components/portfolio/ReturnDistribution';
import { PeriodicReturnsCards } from '../../../components/portfolio/PeriodicReturnsCards';
import { ReportCapture } from '../../../components/report/ReportCapture';
import { DownloadReportButton } from '../../../components/report/DownloadReportButton';
import { toReportFilename } from '../../../components/report/reportFilename';



export default function ClientDashboardPage() {
  const params = useParams();
  const router = useRouter();
  const clientId = params.id as string;
  const reportRef = useRef<HTMLDivElement>(null);

  const [client, setClient] = useState<Record<string, unknown> | null>(null);
  const [dataRows, setDataRows] = useState<Record<string, unknown>[]>([]);
  const [metrics, setMetrics] = useState<ClientMetrics | null>(null);
  const [portfolioRows, setPortfolioRows] = useState<PortfolioRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const res = await fetch(`/api/clients/${clientId}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to fetch client data');
        
        setClient(data.client);
        setDataRows(data.data);
        
        const computed = computeClientMetrics(data.data);
        setMetrics(computed);

        // Map for existing chart components
        let niftyCumulative = 0;
        const mappedRows: PortfolioRow[] = data.data.map((r: Record<string, unknown>) => {
          niftyCumulative += Number(r.niftyChangePct) || 0;
          const roiOnDeposit = Number(r.netMargin) > 0 ? (Number(r.netMtm) / Number(r.netMargin)) * 100 : 0;
          return {
            date: String(r.date),
            netMTM: Number(r.netMtm) || 0,
            roiOnDeposit: roiOnDeposit,
            runningROI: Number(r.runningRoi) || 0,
            niftyDailyChange: Number(r.niftyChangePct) || 0,
            niftyContinue: niftyCumulative,
            dailySwing: Math.abs(Number(r.niftyChangePct) || 0),
            high: null,
            low: null,
            close: null,
            vixClose: r.vixClose !== undefined && r.vixClose !== null ? Number(r.vixClose) : null
          };
        });
        setPortfolioRows(mappedRows);

      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [clientId]);



  if (loading) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <TopNav />
        <div className="flex-1 flex flex-col items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#8B0A3D] mb-4" />
          <p className="text-[#6B4A58]">Loading client dashboard...</p>
        </div>
        <Footer />
      </div>
    );
  }

  if (error || !client || !metrics) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <TopNav />
        <div className="flex-1 flex flex-col items-center justify-center p-4">
          <p className="text-red-600 mb-4">{error || 'Client not found or no data available.'}</p>
          <Button onClick={() => router.back()}>Go Back</Button>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Sticky Top Navigation */}
      <TopNav />

      <main className="flex-1 dashboard-container py-4 md:py-6 w-full space-y-4 md:space-y-6" data-print-content>

        {/* Client identity container — filled treatment to set it apart from the data cards below */}
        <Card className="border-[#EDE0E6] bg-[#FBF2F6] border-l-4 border-l-[#8B0A3D] no-print">
          <CardContent className="p-4 md:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3 md:gap-4 min-w-0">
              <div className="flex flex-col min-w-0">
                <h1 className="text-lg md:text-xl font-extrabold text-[#1A0A10] tracking-tight truncate flex flex-wrap items-baseline gap-x-1">
                  <span>{String(client.name)}&apos;s <span className="text-[#8B0A3D]">Dashboard</span></span>
                </h1>
                <p className="text-xs text-[#9B8A92] mt-0.5 font-sans truncate">
                  {maskMobile(String(client.mobile))} &middot; {maskEmail(String(client.email))}
                </p>
              </div>
            </div>
            <DownloadReportButton
              reportRef={reportRef}
              filename={toReportFilename(String(client.name || 'Client'))}
              disabled={dataRows.length === 0}
            />
          </CardContent>
        </Card>

        {/* The container that will be exported to PDF */}
        <ReportCapture
          ref={reportRef}
          title={String(client.name)}
          subtitle={`${maskMobile(String(client.mobile))} · ${maskEmail(String(client.email))}`}
          period={`${formatDate(metrics.dateRange.from)} – ${formatDate(metrics.dateRange.to)}`}
        >

          {dataRows.length > 0 ? (
            <>
              <ClientKPICards metrics={metrics} />
              <PeriodicReturnsCards data={portfolioRows} />

              <div className="grid grid-cols-1 gap-6">
                <RunningROIChart data={portfolioRows} />
              </div>

              <div className="grid grid-cols-1 gap-6">
                <DailyReturnChart data={portfolioRows} />
                <NetMTMChart data={portfolioRows} metrics={metrics as unknown as PortfolioMetrics} />
              </div>

              <ReturnDistribution metrics={metrics as unknown as PortfolioMetrics} />
            </>
          ) : (
            <div className="bg-white rounded-2xl border border-[#EDE0E6] p-12 text-center shadow-sm" data-report-block>
              <h3 className="text-lg font-bold text-[#1A0A10]">No trading data</h3>
              <p className="text-[#6B4A58] mt-1">This client does not have any data rows.</p>
            </div>
          )}

        </ReportCapture>

      </main>

      <Footer />

      <style jsx global>{`
        /* Styles applied when html2pdf is running */
        .pdf-mode .pdf-branding {
          display: flex !important;
        }
        .pdf-mode .pdf-branding-footer {
          display: block !important;
        }
        .pdf-mode {
          background: white !important;
        }
        .pdf-mode .no-print {
          display: none !important;
        }
        .pdf-mode .pdf-container {
          padding: 20px !important;
          max-width: 100% !important;
        }
        .pdf-mode .grid-cols-1.lg\\:grid-cols-2 {
          grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
        }
        .pdf-mode .grid-cols-1.sm\\:grid-cols-2.lg\\:grid-cols-4 {
          grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
        }
        /* KPI and periodic-return cards default to 3/5 desktop columns,
           which is far too cramped at the A4 content width — text wraps
           and overflows its card. Give them fewer, wider columns instead.
           (Note: styled-jsx double-escapes backslashes, so selectors like
           .sm\\:grid-cols-2 never actually match — use a plain class instead.) */
        .pdf-mode .kpi-cards-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          align-items: start !important;
        }
        .pdf-mode .periodic-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
        }
        .pdf-mode .periodic-grid > *:nth-child(5) {
          grid-column: span 2 !important;
        }
        /* Keep every card/section intact — never split a single container's
           content across two PDF pages. html2pdf's pagebreak plugin reads
           this computed style and pushes the whole element to the next page
           instead of cutting it mid-way. */
        .pdf-mode .card,
        .pdf-mode .pdf-branding,
        .pdf-mode .pdf-branding-footer {
          page-break-inside: avoid;
          break-inside: avoid;
        }
        /* The chart+summary-panel and chart+table layouts squeeze into a
           7fr/3fr column split on wide screens. Recharts legends/axis labels
           need more room than that split leaves them, so on export we reuse
           the same single-column stacking these grids already use on mobile
           — each element gets the full card width, nothing competes for
           space, and nothing is clipped or painted over. */
        .pdf-mode .performance-grid,
        .pdf-mode .distribution-grid {
          grid-template-columns: 1fr !important;
        }
        .pdf-mode .distribution-table td,
        .pdf-mode .distribution-table th,
        .pdf-mode .distribution-table [class*="TableCell"],
        .pdf-mode .distribution-table [class*="TableHead"] {
          overflow: visible !important;
          text-overflow: clip !important;
          white-space: normal !important;
          font-size: 10px !important;
        }
        .pdf-mode .distribution-badge {
          font-size: 9px !important;
        }
        /* Best/Worst Day badges are marked no-print for browser printing,
           but they're useful report content — keep them in the PDF export. */
        .pdf-mode .mtm-badges.no-print {
          display: flex !important;
        }
      `}</style>
    </div>
  );
}
