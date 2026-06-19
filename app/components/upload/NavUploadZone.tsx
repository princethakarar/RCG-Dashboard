"use client";

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { UploadCloud, CheckCircle, AlertCircle, RefreshCw, FileSpreadsheet, Trash2, X } from 'lucide-react';

interface NavFileDetails {
  name: string;
  startDate: string;
  endDate: string;
  rowCount: number;
}

interface NavUploadZoneProps {
  onUploadSuccess: () => void;
  files: NavFileDetails[];
}

export const NavUploadZone: React.FC<NavUploadZoneProps> = ({ onUploadSuccess, files }) => {
  const router = useRouter();
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [uploading, setUploading] = useState<boolean>(false);
  const [deleting, setDeleting] = useState<boolean>(false);
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

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/upload/rcg-alpha-nav', {
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
        setSuccessMsg(`RCG Alpha NAV data updated successfully: ${file.name}`);
        // Let user see success message, then reload dashboard context
        setTimeout(() => {
          onUploadSuccess();
        }, 1500);
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

  const handleDelete = async (fileName: string) => {
    if (!window.confirm(`Are you sure you want to remove all loaded data for "${fileName}"?`)) {
      return;
    }

    setDeleting(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await fetch('/api/upload/rcg-alpha-nav', {
        method: 'DELETE',
      });

      let json;
      try {
        json = await res.json();
      } catch {
        json = null;
      }

      if (res.ok && json?.success) {
        setSuccessMsg(`Successfully removed data from "${fileName}"`);
        onUploadSuccess();
      } else {
        throw new Error(json?.error || 'Failed to delete data');
      }
    } catch (err: unknown) {
      console.error(err);
      setError((err as Error).message || 'Something went wrong during file deletion.');
    } finally {
      setDeleting(false);
    }
  };

  const onButtonClick = () => {
    inputRef.current?.click();
  };

  const formatDateString = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    try {
      return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return dateStr;
    }
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
        className={`w-full min-h-[260px] border-2 border-dashed rounded-2xl flex flex-col items-center justify-center p-8 text-center cursor-pointer transition-all duration-200 bg-white
          ${dragActive 
            ? 'border-[#8B0A3D] bg-[#F8F4F6]' 
            : 'border-[#EDE0E6] hover:border-[#C41E5A] hover:bg-[#F8F4F6]/20'
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
            <RefreshCw size={40} className="text-[#8B0A3D] animate-spin" />
            <p className="text-sm font-bold text-[#1A0A10]">Uploading and parsing NAV spreadsheet...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <UploadCloud size={40} className="text-[#8B0A3D] mb-3" />
            <h4 className="text-sm font-bold text-[#1A0A10] tracking-tight">
              Drag & Drop RCG Alpha NAV File
            </h4>
            <p className="text-xs text-[#9B8A92] mt-1 max-w-xs leading-relaxed font-sans">
              Accepts <span className="font-bold">.xlsx</span> files only. Parses &quot;RIP 3X&quot; and &quot;RIP NET&quot; sheets automatically.
            </p>
            <span className="mt-4 px-3 py-1.5 bg-[#8B0A3D] text-white text-[11px] font-bold rounded-lg hover:bg-[#C41E5A] transition-colors shadow-sm font-sans">
              Select NAV File
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
        <div className="bg-white border border-[#EDE0E6] rounded-2xl p-6 shadow-sm">
          <div className="flex justify-between items-center mb-4 border-b border-[#EDE0E6]/60 pb-3">
            <h3 className="text-xs font-bold text-[#1A0A10] uppercase tracking-wider">
              Currently Loaded NAV Files
            </h3>
            <button
              onClick={() => router.push('/intern-portfolio')}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#8B0A3D] text-white text-xs font-bold rounded-lg hover:bg-[#C41E5A] transition-all shadow-sm font-sans"
            >
              <RefreshCw size={12} />
              <span>Refresh Dashboard</span>
            </button>
          </div>

          <div className="space-y-3">
            {files.map((file, idx) => (
              <div 
                key={idx} 
                className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-[#F8F4F6] border border-[#EDE0E6] rounded-xl gap-3 text-xs font-sans"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-[#8B0A3D]/10 rounded-lg text-[#8B0A3D] shrink-0">
                    <FileSpreadsheet size={16} />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-bold text-[#1A0A10] break-all">{file.name}</span>
                    <span className="text-[10px] text-[#9B8A92] mt-0.5">
                      {formatDateString(file.startDate)} – {formatDateString(file.endDate)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3 self-start sm:self-auto shrink-0">
                  <span className="px-2 py-0.5 bg-[#C41E5A]/15 text-[#C41E5A] border border-[#C41E5A]/20 text-[10px] font-bold rounded">
                    {file.rowCount} rows
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(file.name);
                    }}
                    disabled={deleting}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                    title="Remove file"
                  >
                    {deleting ? (
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

export default NavUploadZone;
