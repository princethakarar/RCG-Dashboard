"use client";

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { UploadCloud, CheckCircle, AlertCircle, FileSpreadsheet, RefreshCw, Trash2 } from 'lucide-react';
import { LoadedFile } from '../../lib/types';

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

    const formData = new FormData();
    formData.append('file', file);

    try {
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
        <div className="bg-green-50 border border-green-200 text-green-800 p-4 rounded-xl flex items-center gap-2.5 text-xs font-semibold animate-fade-in shadow-sm">
          <CheckCircle size={16} className="text-green-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-xl flex items-center gap-2.5 text-xs font-semibold animate-fade-in shadow-sm">
          <AlertCircle size={16} className="text-red-600 shrink-0" />
          <span>{error}</span>
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
