"use client";

import React, { forwardRef, useEffect, useState } from 'react';
import Image from 'next/image';

interface ReportCaptureProps {
  /** Main heading of the report — client name, dashboard name, etc. */
  title: string;
  /** Optional second line under the title (masked contact, description). */
  subtitle?: string;
  /** Reporting window, rendered as "Report Period: {period}". */
  period?: string;
  /** Extra meta chips rendered alongside the period. */
  metaLines?: string[];
  /** Spacing utilities for the container, so wrapping a page's existing
   *  section stack doesn't change its on-screen rhythm. */
  className?: string;
  children: React.ReactNode;
}

/**
 * Wraps a page's report content in the branded RCG header/footer.
 *
 * Both branding blocks are hidden on screen and revealed only while the
 * capture engine has `.pdf-mode` applied to this container, so the live page
 * looks exactly as it did before. All `.pdf-mode` styling lives here so every
 * page that exports a report gets identical treatment.
 */
export const ReportCapture = forwardRef<HTMLDivElement, ReportCaptureProps>(
  ({ title, subtitle, period, metaLines = [], className = 'space-y-6', children }, ref) => {
    // Rendered after mount so the server and client markup can't disagree on
    // the date. The branding block is invisible until capture anyway.
    const [generatedOn, setGeneratedOn] = useState<string | null>(null);
    useEffect(() => {
      setGeneratedOn(
        new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
      );
    }, []);

    const meta = [
      ...(period ? [`Report Period: ${period}`] : []),
      ...metaLines,
      ...(generatedOn ? [`Generated: ${generatedOn}`] : []),
    ];

    return (
      <div ref={ref} className={`pdf-container ${className}`}>

        {/* Branding header — shown only in the exported PDF report */}
        <div
          className="hidden pdf-branding bg-white p-8 rounded-2xl border-2 border-[#8B0A3D]/15 mb-6 flex-col items-center justify-center text-center"
          data-report-block
        >
          {/* `unoptimized` serves the full 620x504 asset instead of next/image's
              256px downscale, which left the wordmark technically present but too
              soft to read at normal PDF zoom. It also keeps the /_next/image
              endpoint out of the capture path — html2canvas refetches every image
              once per block, so an export was making ~18 round-trips through the
              optimizer for this one logo. Intrinsic width/height match the real
              asset so layout never resolves from a wrong aspect ratio. */}
          <Image
            src="/logo.png"
            alt="Rising Capital Group"
            width={620}
            height={504}
            unoptimized
            className="h-20 w-auto mb-4 mx-auto"
          />
          <h2 className="text-2xl font-extrabold text-[#1A0A10] tracking-tight">{title}</h2>
          {subtitle && (
            <p className="text-[#6B4A58] text-sm mt-1 font-medium">{subtitle}</p>
          )}
          {meta.length > 0 && (
            <div className="flex items-center justify-center gap-3 mt-4 pt-4 border-t border-[#EDE0E6] w-full text-[11px] text-[#9B8A92] font-semibold uppercase tracking-wide">
              {meta.map((line, i) => (
                <React.Fragment key={line}>
                  {i > 0 && <span>&middot;</span>}
                  <span>{line}</span>
                </React.Fragment>
              ))}
            </div>
          )}
        </div>

        {children}

        {/* PDF Footer branding */}
        <div className="hidden pdf-branding-footer mt-12 pt-8 border-t border-[#EDE0E6] text-center" data-report-block>
          <p className="text-[#8B0A3D] font-extrabold text-sm uppercase tracking-widest mb-2">Rising Capital Group</p>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[#9B8A92] mb-3">NSE F&amp;O Partner &middot; NIFTY Options Desk</p>
          <p className="text-[10px] text-[#6B4A58] italic max-w-2xl mx-auto mb-4">
            &quot;Don&apos;t follow us&mdash;follow the process. Don&apos;t believe opinions&mdash;believe the data. Anyone can trade, but only a few have the discipline to follow the process.&quot;
          </p>
          <div className="text-[10px] text-[#9B8A92] leading-relaxed">
            <p>Unit no :- P03-02A&amp;B, 3rd Floor, Tower A, WTC Gift City, Block No 51, Road 5E, Zone-5 Gift City, Gandhinagar, Gujarat</p>
            <p>Phone: +91 9316597989 &middot; Email: info@risingcapitalgroup.in</p>
          </div>
          <p className="text-[9px] text-[#C4B8BE] mt-4">
            This is a system-generated report for internal review purposes only. Past performance does not guarantee future results.
          </p>
        </div>

        <style jsx global>{`
          /* Styles applied while the capture engine is running */
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
          /* Tailwind's responsive grid classes key off the viewport, not the
             element, so locking the report to the A4 content width doesn't
             reflow them — a 5-column KPI row would stay 5 columns in 718px and
             wrap its text. Any grid marked data-report-grid drops to 2 columns
             for export, which generalises the two hardcoded class selectors
             this used to carry. */
          .pdf-mode [data-report-grid='2'] {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            align-items: start !important;
          }
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
          /* .stats-card pins overflow:hidden and clamps its sub-label to two
             lines with -webkit-line-clamp. html2canvas implements neither
             -webkit-box nor line-clamp, so its clone lays the card out taller
             than the live DOM and the bottom line gets sliced off by that
             overflow:hidden. Let the card size to its content for the capture;
             on screen nothing changes. */
          .pdf-mode .stats-card {
            overflow: visible !important;
            height: auto !important;
          }
          .pdf-mode .stats-card .sub-label {
            display: block !important;
            -webkit-line-clamp: unset !important;
            overflow: visible !important;
          }
          /* The chart+summary-panel and chart+table layouts squeeze into a
             7fr/3fr column split on wide screens. Recharts legends/axis labels
             need more room than that split leaves them, so on export we reuse
             the same single-column stacking these grids already use on mobile. */
          .pdf-mode .performance-grid,
          .pdf-mode .distribution-grid {
            grid-template-columns: 1fr !important;
          }
          .pdf-mode .distribution-table td,
          .pdf-mode .distribution-table th,
          .pdf-mode .distribution-table [class*='TableCell'],
          .pdf-mode .distribution-table [class*='TableHead'] {
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
);

ReportCapture.displayName = 'ReportCapture';

export default ReportCapture;
