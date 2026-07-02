"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { TopNav } from '../../components/layout/TopNav';
import { Footer } from '../../components/layout/Footer';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { ArrowLeft, Upload, Loader2, FileSpreadsheet } from 'lucide-react';

export default function AddClientPage() {
  const router = useRouter();
  
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [file, setFile] = useState<File | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ name?: string; mobile?: string; email?: string; file?: string }>({});

  const handleMobileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // allow only numbers and optional leading +
    const val = e.target.value.replace(/[^\d+]/g, '');
    setMobile(val);
    if (fieldErrors.mobile) setFieldErrors(prev => ({ ...prev, mobile: undefined }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      if (fieldErrors.file) setFieldErrors(prev => ({ ...prev, file: undefined }));
    }
  };

  const validateName = (v: string) => {
    if (!v.trim()) return 'Full name is required.';
    if (v.trim().length < 2) return 'Name must be at least 2 characters.';
    if (!/^[a-zA-Z\s.'-]+$/.test(v.trim())) return 'Name can only contain letters and spaces.';
    return undefined;
  };

  const validateMobileValue = (v: string) => {
    const digits = v.replace(/\D/g, '');
    if (!v.trim()) return 'Mobile number is required.';
    if (digits.length < 10 || digits.length > 13) return 'Enter a valid mobile number (10-13 digits).';
    return undefined;
  };

  const validateEmailValue = (v: string) => {
    if (!v.trim()) return 'Email address is required.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())) return 'Enter a valid email address.';
    return undefined;
  };

  const validateFileValue = (f: File | null) => {
    if (!f) return 'Please select an Excel file to upload.';
    if (!f.name.toLowerCase().endsWith('.xlsx')) return 'The file must be a .xlsx Excel file.';
    return undefined;
  };

  const validate = () => {
    const errors = {
      name: validateName(name),
      mobile: validateMobileValue(mobile),
      email: validateEmailValue(email),
      file: validateFileValue(file),
    };
    setFieldErrors(errors);
    return Object.values(errors).some(Boolean);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (validate()) {
      return;
    }

    try {
      setLoading(true);
      const formData = new FormData();
      formData.append('name', name);
      formData.append('mobile', mobile);
      formData.append('email', email);
      formData.append('file', file as Blob);

      const res = await fetch('/api/clients/add', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to add client');
      }

      // Success, route to dashboard
      router.push(`/backoffice/client/${data.clientId}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Sticky Top Navigation */}
      <TopNav />

      {/* Page Header (matches PageHeader styling on main dashboard) */}
      <div className="w-full bg-white dashboard-container pt-5 md:pt-7 pb-4 md:pb-6 border-b border-rcg-border/30 flex items-center gap-3 md:gap-4 select-none">
        <button
          onClick={() => router.back()}
          className="p-2 -ml-1 rounded-full text-[#6B4A58] hover:text-[#8B0A3D] hover:bg-[#F8F4F6] transition-colors shrink-0"
          title="Go back"
          aria-label="Go back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex flex-col">
          <h1 className="text-xl sm:text-2xl lg:text-[28px] font-extrabold text-[#1A0A10] tracking-tight leading-tight flex flex-wrap items-baseline gap-x-2">
            <span>Add New <span className="text-[#8B0A3D]">Client</span></span>
          </h1>
          <p className="text-xs sm:text-[13px] font-normal text-[#9B8A92] mt-1.5 sm:mt-2 font-sans">
            Create a profile and upload their trading data
          </p>
        </div>
      </div>

      <main className="flex-1 dashboard-container py-4 md:py-6 w-full max-w-[800px]">
        <Card className="border-[#EDE0E6] bg-white overflow-hidden">
          <CardHeader className="bg-white border-b border-[#EDE0E6]">
            <CardTitle className="text-[#1A0A10] text-lg">Client Details</CardTitle>
            <CardDescription>Enter the client&apos;s information and upload their P&amp;L Excel file.</CardDescription>
          </CardHeader>
          <CardContent className="p-6 bg-white">
            <form onSubmit={handleSubmit} noValidate className="space-y-6">
              
              {error && (
                <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm font-medium">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-[#1A0A10]">Full Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (fieldErrors.name) setFieldErrors(prev => ({ ...prev, name: undefined }));
                    }}
                    placeholder="Enter full name"
                    className={`w-full p-3 rounded-xl border bg-[#F8F4F6]/50 focus:bg-white focus:outline-none focus:ring-2 transition-all ${fieldErrors.name ? 'border-red-400 focus:ring-red-100 focus:border-red-500' : 'border-[#EDE0E6] focus:ring-[#8B0A3D]/20 focus:border-[#8B0A3D]'}`}
                  />
                  {fieldErrors.name && <p className="text-xs text-red-600 font-medium">{fieldErrors.name}</p>}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-[#1A0A10]">Mobile Number</label>
                  <input
                    type="tel"
                    value={mobile}
                    onChange={handleMobileChange}
                    placeholder="Enter mobile number"
                    className={`w-full p-3 rounded-xl border bg-[#F8F4F6]/50 focus:bg-white focus:outline-none focus:ring-2 transition-all ${fieldErrors.mobile ? 'border-red-400 focus:ring-red-100 focus:border-red-500' : 'border-[#EDE0E6] focus:ring-[#8B0A3D]/20 focus:border-[#8B0A3D]'}`}
                  />
                  {fieldErrors.mobile && <p className="text-xs text-red-600 font-medium">{fieldErrors.mobile}</p>}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-[#1A0A10]">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (fieldErrors.email) setFieldErrors(prev => ({ ...prev, email: undefined }));
                  }}
                  placeholder="Enter email address"
                  className={`w-full p-3 rounded-xl border bg-[#F8F4F6]/50 focus:bg-white focus:outline-none focus:ring-2 transition-all ${fieldErrors.email ? 'border-red-400 focus:ring-red-100 focus:border-red-500' : 'border-[#EDE0E6] focus:ring-[#8B0A3D]/20 focus:border-[#8B0A3D]'}`}
                />
                {fieldErrors.email && <p className="text-xs text-red-600 font-medium">{fieldErrors.email}</p>}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-[#1A0A10]">Upload Excel File (.xlsx)</label>
                <label
                  htmlFor="file-upload"
                  className={`mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-xl bg-[#F8F4F6]/50 hover:bg-[#F3E8EC] transition-colors relative cursor-pointer ${fieldErrors.file ? 'border-red-400' : 'border-[#D2C5CB]'}`}
                >
                  <input id="file-upload" name="file-upload" type="file" className="sr-only" accept=".xlsx" onChange={handleFileChange} />
                  <div className="space-y-2 text-center">
                    {file ? (
                      <div className="flex flex-col items-center">
                        <FileSpreadsheet className="mx-auto h-10 w-10 text-[#16A34A]" />
                        <span className="mt-2 block text-sm font-medium text-[#1A0A10]">{file.name}</span>
                        <button
                          type="button"
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setFile(null); }}
                          className="text-xs text-[#DC2626] font-semibold mt-1 hover:underline"
                        >
                          Remove file
                        </button>
                      </div>
                    ) : (
                      <>
                        <Upload className="mx-auto h-10 w-10 text-[#9B8A92]" />
                        <div className="flex text-sm text-[#6B4A58] justify-center">
                          <span className="font-bold text-[#8B0A3D]">Click to upload</span>
                          <p className="pl-1">or drag and drop</p>
                        </div>
                        <p className="text-xs text-[#9B8A92]">
                          Must contain expected headers (DATE, NET MARGIN, etc.)
                        </p>
                      </>
                    )}
                  </div>
                </label>
                {fieldErrors.file && <p className="text-xs text-red-600 font-medium">{fieldErrors.file}</p>}
              </div>

              <div className="pt-4 border-t border-[#EDE0E6] flex justify-end gap-3">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => router.back()}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  className="bg-[#8B0A3D] hover:bg-[#700832]"
                  disabled={loading}
                >
                  {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {loading ? 'Saving Client...' : 'Save & Generate Dashboard'}
                </Button>
              </div>

            </form>
          </CardContent>
        </Card>
      </main>

      <Footer />
    </div>
  );
}
