"use client";

import React, { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Loader2 } from 'lucide-react';
import Image from 'next/image';
import { Button } from '../../../components/ui/button';
import { maskMobile, maskEmail } from '../../../lib/formatters';
import { computeClientMetrics, ClientMetrics } from '../../../lib/clientCalculations';
import { PortfolioRow, PortfolioMetrics } from '../../../lib/types';
import ClientKPICards from '../../../components/portfolio/ClientKPICards';
import { RunningROIChart } from '../../../components/portfolio/RunningROIChart';
import { DailyReturnChart } from '../../../components/portfolio/DailyReturnChart';
import { NetMTMChart } from '../../../components/portfolio/NetMTMChart';
import { ReturnDistribution } from '../../../components/portfolio/ReturnDistribution';
import { PeriodicReturnsCards } from '../../../components/portfolio/PeriodicReturnsCards';



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
  // const [generatingPDF, setGeneratingPDF] = useState(false);

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

  /*
  const downloadPDF = async () => {
    if (!reportRef.current) return;
    setGeneratingPDF(true);
    
    // We add a temporary class to the container to style it specifically for PDF
    reportRef.current.classList.add('pdf-mode');

    const opt = {
      margin: 10,
      filename: `${String(client?.name || 'Client').replace(/\s+/g, '_')}_Report.pdf`,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const }
    };

    try {
      // @ts-expect-error
      const html2pdf = (await import('html2pdf.js')).default;
      await html2pdf().from(reportRef.current).set(opt).save();
    } catch (e) {
      console.error('PDF generation failed:', e);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      reportRef.current.classList.remove('pdf-mode');
      setGeneratingPDF(false);
    }
  };
  */



  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F4F6] flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#8B0A3D] mb-4" />
        <p className="text-[#6B4A58]">Loading client dashboard...</p>
      </div>
    );
  }

  if (error || !client || !metrics) {
    return (
      <div className="min-h-screen bg-[#F8F4F6] flex flex-col items-center justify-center p-4">
        <p className="text-red-600 mb-4">{error || 'Client not found or no data available.'}</p>
        <Button onClick={() => router.back()}>Go Back</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F4F6] pb-24">
      {/* Non-printable top header */}
      <div className="bg-[#8B0A3D] text-white pt-6 pb-6 px-4 md:px-8 shadow-md no-print">
        <div className="max-w-[1400px] mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => router.push('/backoffice')} 
              className="p-2 hover:bg-white/10 rounded-full transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold font-sans tracking-tight">{String(client.name)}&apos;s Dashboard</h1>
              <p className="text-white/80 text-xs mt-0.5">
                {maskMobile(String(client.mobile))} | {maskEmail(String(client.email))}
              </p>
            </div>
          </div>
          {/* Download button temporarily hidden per request */}
          {/* <Button 
            onClick={downloadPDF} 
            disabled={generatingPDF}
            className="bg-white text-[#8B0A3D] hover:bg-white/90 font-bold"
          >
            {generatingPDF ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
            {generatingPDF ? 'Generating...' : 'Download Report'}
          </Button> */}
        </div>
      </div>

      {/* The container that will be exported to PDF */}
      <div ref={reportRef} className="pdf-container max-w-[1400px] mx-auto px-4 md:px-8 pt-8 space-y-6">
        
        {/* Branding header (visible only in PDF mode or standard page depending on preference, but good to have a dedicated block) */}
        <div className="hidden pdf-branding bg-white p-6 rounded-2xl border border-[#EDE0E6] shadow-sm mb-6 flex-col items-center justify-center text-center">
           <Image src="/logo.png" alt="Rising Capital Group" width={120} height={48} className="h-12 w-auto mb-4 mx-auto" />
           <h2 className="text-xl font-bold text-[#1A0A10]">{String(client.name)}</h2>
           <p className="text-[#6B4A58] text-sm">{maskMobile(String(client.mobile))} | {maskEmail(String(client.email))}</p>
           <p className="text-[#9B8A92] text-xs mt-1">Report Period: {metrics.dateRange.from} to {metrics.dateRange.to}</p>
        </div>

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
          <div className="bg-white rounded-2xl border border-[#EDE0E6] p-12 text-center shadow-sm">
            <h3 className="text-lg font-bold text-[#1A0A10]">No trading data</h3>
            <p className="text-[#6B4A58] mt-1">This client does not have any data rows.</p>
          </div>
        )}

        {/* PDF Footer branding */}
        <div className="hidden pdf-branding-footer mt-12 pt-8 border-t border-[#EDE0E6] text-center">
           <p className="text-[#8B0A3D] font-bold text-sm uppercase tracking-widest mb-2">Rising Capital Group</p>
           <p className="text-[10px] text-[#6B4A58] italic max-w-2xl mx-auto mb-4">
             &quot;Don&apos;t follow us&mdash;follow the process. Don&apos;t believe opinions&mdash;believe the data. Anyone can trade, but only a few have the discipline to follow the process.&quot;
           </p>
           <div className="text-[10px] text-[#9B8A92]">
             <p>A-312, Shilp Corporate Park, Rajpath Rangoli Road, Bodakdev, Ahmedabad, Gujarat 380054</p>
             <p>+91 97148 40608 | accounts@risingcapital.in</p>
           </div>
        </div>
      </div>

      <style jsx global>{`
        /* Styles applied when html2pdf is running */
        .pdf-mode .pdf-branding,
        .pdf-mode .pdf-branding-footer {
          display: flex !important;
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
      `}</style>
    </div>
  );
}
