"use client";

import React, { useCallback, useEffect, useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { Button } from '../ui/button';
import { generateReport } from './reportEngine';

interface DownloadReportButtonProps {
  reportRef: React.RefObject<HTMLDivElement>;
  filename: string;
  /** Keep the button disabled until the page's data has finished loading. */
  disabled?: boolean;
  className?: string;
}

interface RegisteredReport {
  filename: string;
  generate: () => Promise<void>;
}

declare global {
  interface Window {
    /** Registry the QA script drives instead of clicking + intercepting a download. */
    __RCG_REPORTS__?: RegisteredReport[];
  }
}

export const DownloadReportButton: React.FC<DownloadReportButtonProps> = ({
  reportRef,
  filename,
  disabled = false,
  className = '',
}) => {
  const [generating, setGenerating] = useState(false);

  const run = useCallback(async () => {
    if (!reportRef.current) return;
    setGenerating(true);
    try {
      await generateReport(reportRef.current, filename);
    } catch (e) {
      console.error('PDF generation failed:', e);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setGenerating(false);
    }
  }, [reportRef, filename]);

  // Expose the generator so scripts/qa-reports.mjs can invoke it directly.
  useEffect(() => {
    const entry: RegisteredReport = { filename, generate: run };
    window.__RCG_REPORTS__ = [...(window.__RCG_REPORTS__ || []), entry];
    return () => {
      window.__RCG_REPORTS__ = (window.__RCG_REPORTS__ || []).filter(r => r !== entry);
    };
  }, [filename, run]);

  return (
    <Button
      onClick={run}
      disabled={disabled || generating}
      className={`shrink-0 self-start sm:self-auto no-print ${className}`}
    >
      {generating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
      {generating ? 'Generating...' : 'Download Report'}
    </Button>
  );
};

export default DownloadReportButton;
