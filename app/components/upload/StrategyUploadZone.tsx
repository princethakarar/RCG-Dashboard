"use client";

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { UploadCloud, CheckCircle, AlertCircle, RefreshCw, FileSpreadsheet, X } from 'lucide-react';

interface StrategyFileDetails {
  name: string;
  startDate?: string;
  endDate?: string;
  rowCount?: number;
}

interface StrategyUploadZoneProps {
  onUploadSuccess: () => void;
  files: StrategyFileDetails[];
  strategyName: string;
}

export const StrategyUploadZone: React.FC<StrategyUploadZoneProps> = ({ onUploadSuccess, files, strategyName }) => {
  const router = useRouter();
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [uploading, setUploading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
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

      const worker = new Worker(new URL('../../workers/excel.worker.ts', import.meta.url), { type: 'module' });
      
      const parsedData = await new Promise<unknown>((resolve, reject) => {
        worker.onmessage = (event) => {
          if (event.data.success) {
            resolve(event.data.data);
          } else {
            reject(new Error(event.data.error || 'Worker parsing failed'));
          }
          worker.terminate();
        };

        worker.onerror = (error) => {
          reject(new Error('Worker encountered an error: ' + error.message));
          worker.terminate();
        };

        worker.postMessage({ type: 'parse_strategy', strategyName, arrayBuffer }, [arrayBuffer]);
      });

      const formData = new FormData();
      if (file.size <= 4 * 1024 * 1024) {
        formData.append('file', file);
      }
      formData.append('parsedData', JSON.stringify(parsedData));
      formData.append('strategy', strategyName);

      const res = await fetch('/api/upload/strategy', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      setSuccessMsg(`Successfully uploaded ${strategyName} Data`);
      onUploadSuccess();
      router.refresh();
      
      if (inputRef.current) inputRef.current.value = '';
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setUploading(false);
    }
  };

  const formatDateString = (dateStr?: string) => {
    if (!dateStr) return '';
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
        onClick={() => inputRef.current?.click()}
        className={`w-full min-h-[260px] border-2 border-dashed rounded-2xl flex flex-col items-center justify-center p-8 text-center cursor-pointer transition-all duration-200
          ${dragActive 
            ? 'border-brand-primary bg-brand-surface' 
            : 'border-brand-border hover:border-brand-accent hover:bg-brand-surface/20'
          } ${uploading ? 'opacity-50 pointer-events-none' : ''}`}
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
            <p className="text-sm font-bold text-brand-text-primary">Processing Strategy Data...</p>
            <p className="text-xs text-brand-text-secondary mt-1 font-sans">Parsing Day-Wise P&amp;L</p>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <UploadCloud size={40} className="text-brand-primary mb-3" />
            <h4 className="text-sm font-bold text-brand-text-primary tracking-tight">
              Drag & Drop Strategy Excel File
            </h4>
            <p className="text-xs text-brand-text-secondary mt-1 max-w-xs leading-relaxed">
              Accepts <span className="font-bold">.xlsx</span> files only. Files will be parsed and saved in the strategy database.
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
              onClick={() => router.push('/strategies')}
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
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
