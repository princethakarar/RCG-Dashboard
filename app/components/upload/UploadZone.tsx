"use client";

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { UploadCloud, CheckCircle, AlertCircle, FileSpreadsheet, RefreshCw, Trash2, X } from 'lucide-react';
import { LoadedFile } from '../../lib/types';
import * as XLSX from 'xlsx';
import {
  parseExcelDate,
  parseFloatValue,
  parseFloatValueOrNull,
  isDateCellFilled,
  isDataRow,
  isCellValidAndFilled,
  ExcelCellValue
} from '../../lib/excelParser';

interface UploadZoneProps {
  onUploadSuccess: () => void;
  files: LoadedFile[];
}

export const UploadZone: React.FC<UploadZoneProps> = ({ onUploadSuccess, files }) => {
  const router = useRouter();
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [uploading, setUploading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [deletingUrls, setDeletingUrls] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      await handleFile(e.target.files[0]);
    }
  };

  const handleFile = async (file: File) => {
    if (!file.name.endsWith('.xlsx')) {
      setError('Only .xlsx (Excel) files are supported.');
      setSuccessMsg(null);
      return;
    }

    setUploading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const wb = XLSX.read(arrayBuffer, { type: 'array', cellDates: true });

      const sheet1Name = wb.SheetNames.find(s => {
        const norm = s.trim().toUpperCase();
        return norm === 'RCG INTERS' || norm === 'RCG INTERNS';
      }) || wb.SheetNames[0];

      const sheet1Rows: Record<string, unknown>[] = [];
      if (sheet1Name) {
        const ws1 = wb.Sheets[sheet1Name];
        const rawSheet1 = XLSX.utils.sheet_to_json(ws1, { header: 1 }) as ExcelCellValue[][];
        for (let i = 1; i < rawSheet1.length; i++) {
          const row = rawSheet1[i];
          if (!row || !row[0]) continue;
          const dateStr = parseExcelDate(row[0]);
          if (!dateStr || !isDateCellFilled(row[0])) continue;

          sheet1Rows.push({
            date: dateStr,
            net_mtm: parseFloatValue(row[1]),
            running_pl: parseFloatValue(row[2]),
            avg_deposit: parseFloatValue(row[15]),
            net_margin: parseFloatValue(row[16]),
          });
        }
      }

      const sheet2Name = wb.SheetNames.find(s => {
        const norm = s.trim().toUpperCase();
        return norm === 'NIFTY VS RCG INTERS' || norm === 'NIFTY VS RCG INTERS 3 X';
      });

      const sheet2Rows: Record<string, unknown>[] = [];
      if (sheet2Name) {
        const ws2 = wb.Sheets[sheet2Name];
        const rawSheet2 = XLSX.utils.sheet_to_json(ws2, { header: 1 }) as ExcelCellValue[][];
        for (let i = 1; i < rawSheet2.length; i++) {
          const row = rawSheet2[i];
          if (!isDataRow(row)) break;
          const dateStr = parseExcelDate(row[0]);
          if (!dateStr) break;
          if (
            !isCellValidAndFilled(row[0]) ||
            !isCellValidAndFilled(row[1]) ||
            !isCellValidAndFilled(row[2]) ||
            !isCellValidAndFilled(row[3], true) ||
            !isCellValidAndFilled(row[4]) ||
            !isCellValidAndFilled(row[5]) ||
            !isCellValidAndFilled(row[6])
          ) continue;

          sheet2Rows.push({
            date: dateStr,
            net_mtm: parseFloatValue(row[1]),
            roi_on_deposit: parseFloatValue(row[2]),
            running_roi: parseFloatValue(row[3]),
            nifty_daily: parseFloatValueOrNull(row[4]),
            nifty_continue: parseFloatValueOrNull(row[5]),
            daily_swing: parseFloatValueOrNull(row[6]),
            high: parseFloatValueOrNull(row[7]),
            low: parseFloatValueOrNull(row[8]),
            close: parseFloatValueOrNull(row[9]),
          });
        }
      }

      const sheet3Name = wb.SheetNames.find(s => {
        const norm = s.trim().toUpperCase();
        return norm === 'NIFTY VS RCG INTERS NET AMOUNT';
      });

      const sheet3Rows: Record<string, unknown>[] = [];
      if (sheet3Name) {
        const ws3 = wb.Sheets[sheet3Name];
        const rawSheet3 = XLSX.utils.sheet_to_json(ws3, { header: 1 }) as ExcelCellValue[][];
        for (let i = 1; i < rawSheet3.length; i++) {
          const row = rawSheet3[i];
          if (!isDataRow(row)) break;
          const dateStr = parseExcelDate(row[0]);
          if (!dateStr) break;
          if (
            !isCellValidAndFilled(row[0]) ||
            !isCellValidAndFilled(row[1]) ||
            !isCellValidAndFilled(row[2], true) ||
            !isCellValidAndFilled(row[3]) ||
            !isCellValidAndFilled(row[4]) ||
            !isCellValidAndFilled(row[5]) ||
            !isCellValidAndFilled(row[6])
          ) continue;

          sheet3Rows.push({
            date: dateStr,
            net_mtm: parseFloatValue(row[1]),
            running_roi: parseFloatValue(row[2]),
            day_roi: parseFloatValue(row[3]),
            nifty_daily: parseFloatValueOrNull(row[4]),
            nifty_continue: parseFloatValueOrNull(row[5]),
            daily_swing: parseFloatValueOrNull(row[6]),
            high: parseFloatValueOrNull(row[7]),
            low: parseFloatValueOrNull(row[8]),
            close: parseFloatValueOrNull(row[9]),
          });
        }
      }

      const formData = new FormData();
      if (file.size <= 4 * 1024 * 1024) {
        formData.append('file', file);
      }
      formData.append('parsedData', JSON.stringify({ sheet1Rows, sheet2Rows, sheet3Rows, filename: file.name }));

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      let json;
      try {
        json = await res.json();
      } catch {
        json = null;
      }

      if (res.ok && json?.success) {
        setSuccessMsg(`${file.name} ✓ Added to data folder`);
        // Wait for Vercel Blob to propagate in production before re-fetching dashboard data
        await new Promise(resolve => setTimeout(resolve, 2500));
        onUploadSuccess(); // Trigger refetch of list in parent
      } else {
        throw new Error(json?.error || 'Failed to upload file');
      }
    } catch (err: unknown) {
      console.error(err);
      setError((err as Error).message || 'Something went wrong during file upload.');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (url: string, name: string) => {
    if (!window.confirm(`Are you sure you want to remove the file "${name}"?`)) {
      return;
    }

    setDeletingUrls(prev => [...prev, url]);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await fetch(`/api/upload?url=${encodeURIComponent(url)}`, {
        method: 'DELETE',
      });

      let json;
      try {
        json = await res.json();
      } catch {
        json = null;
      }

      if (res.ok && json?.success) {
        setSuccessMsg(`Successfully removed "${name}"`);
        onUploadSuccess();
      } else {
        throw new Error(json?.error || 'Failed to delete file');
      }
    } catch (err: unknown) {
      console.error(err);
      setError((err as Error).message || 'Something went wrong during file deletion.');
    } finally {
      setDeletingUrls(prev => prev.filter(u => u !== url));
    }
  };

  const onButtonClick = () => {
    inputRef.current?.click();
  };

  const formatDateString = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <div className="space-y-6">
      {/* Drop Zone */}
      <div 
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={onButtonClick}
        className={`w-full min-h-[260px] border-2 border-dashed rounded-2xl flex flex-col items-center justify-center p-8 text-center cursor-pointer transition-all duration-200
          ${dragActive 
            ? 'border-brand-primary bg-brand-surface' 
            : 'border-brand-border hover:border-brand-accent hover:bg-brand-surface/20'
          }`}
      >
        <input 
          ref={inputRef}
          type="file" 
          accept=".xlsx" 
          className="hidden" 
          onChange={handleFileChange}
          disabled={uploading}
        />
        
        {uploading ? (
          <div className="flex flex-col items-center gap-3">
            <RefreshCw size={40} className="text-brand-primary animate-spin" />
            <p className="text-sm font-bold text-brand-text-primary">Uploading and parsing Excel file...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <UploadCloud size={40} className="text-brand-primary mb-3" />
            <h4 className="text-sm font-bold text-brand-text-primary tracking-tight">
              Drag & Drop Performance Excel File
            </h4>
            <p className="text-xs text-brand-text-secondary mt-1 max-w-xs leading-relaxed">
              Accepts <span className="font-bold">.xlsx</span> files only. Files will be parsed and saved in the data folder.
            </p>
            <span className="mt-4 px-3 py-1.5 bg-brand-primary text-white text-[11px] font-extrabold rounded-lg hover:bg-brand-secondary transition-colors shadow-sm">
              Select File From Computer
            </span>
          </div>
        )}
      </div>

      {/* Success/Error Banners */}
      {successMsg && (
        <div className="bg-green-50 border border-green-200 text-green-800 p-4 rounded-md flex items-start justify-between gap-2.5 text-xs font-semibold animate-fade-in shadow-sm font-sans">
          <div className="flex items-start gap-2.5">
            <CheckCircle size={16} className="text-green-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-sm mb-1">Success</p>
              <p className="font-normal">{successMsg}</p>
            </div>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-green-600 hover:bg-green-100 p-1 rounded-md transition-colors shrink-0">
            <X size={14} />
          </button>
        </div>
      )}

      {error && (
        <div className="bg-[#C41E5A]/10 border border-[#C41E5A]/20 text-[#C41E5A] p-4 rounded-md flex items-start justify-between gap-2.5 text-xs font-semibold animate-fade-in shadow-sm font-sans">
          <div className="flex items-start gap-2.5">
            <AlertCircle size={16} className="text-[#C41E5A] shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-sm mb-1">Upload Failed</p>
              <p className="font-normal">{error}</p>
            </div>
          </div>
          <button onClick={() => setError(null)} className="text-[#C41E5A] hover:bg-[#C41E5A]/20 p-1 rounded-md transition-colors shrink-0">
            <X size={14} />
          </button>
        </div>
      )}

      {/* File List Card */}
      {files.length > 0 && (
        <div className="bg-white border border-brand-border rounded-2xl p-6 shadow-sm">
          <div className="flex justify-between items-center mb-4 border-b border-brand-border/60 pb-3">
            <h3 className="text-xs font-bold text-brand-text-primary uppercase tracking-wider">
              Currently Loaded Files
            </h3>
            <button
              onClick={() => router.push('/intern-portfolio')}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-brand-primary text-white text-xs font-bold rounded-lg hover:bg-brand-secondary transition-all shadow-sm"
            >
              <RefreshCw size={12} />
              <span>Refresh Dashboard</span>
            </button>
          </div>

          <div className="space-y-3">
            {files.map((file, idx) => (
              <div 
                key={idx} 
                className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-brand-surface border border-brand-border rounded-xl gap-3 text-xs"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-brand-primary/10 rounded-lg text-brand-primary shrink-0">
                    <FileSpreadsheet size={16} />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-bold text-brand-text-primary break-all">{file.name}</span>
                    <span className="text-[10px] text-brand-text-secondary mt-0.5">
                      {formatDateString(file.startDate)} – {formatDateString(file.endDate)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3 self-start sm:self-auto shrink-0">
                  <span className="px-2 py-0.5 bg-brand-accent/15 text-brand-accent border border-brand-accent/20 text-[10px] font-bold rounded">
                    {file.rowCount} rows
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(file.url, file.name);
                    }}
                    disabled={deletingUrls.includes(file.url)}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                    title="Remove file"
                  >
                    {deletingUrls.includes(file.url) ? (
                      <RefreshCw size={14} className="animate-spin text-red-600" />
                    ) : (
                      <Trash2 size={14} />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
export default UploadZone;
