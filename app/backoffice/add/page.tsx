"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
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

  const handleMobileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // allow only numbers and optional leading +
    const val = e.target.value.replace(/[^\d+]/g, '');
    setMobile(val);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const validate = () => {
    if (!name.trim()) return "Name is required.";
    const cleanMobile = mobile.replace(/\D/g, '');
    if (cleanMobile.length < 10) return "Please enter a valid 10-digit mobile number.";
    if (!email.trim() || !email.includes('@')) return "Please enter a valid email address.";
    if (!file) return "Please select an Excel file to upload.";
    if (!file.name.toLowerCase().endsWith('.xlsx')) return "The file must be a .xlsx Excel file.";
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const validationError = validate();
    if (validationError) {
      setError(validationError);
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
    <div className="min-h-screen bg-[#F8F4F6] pb-24">
      {/* Header section */}
      <div className="bg-[#8B0A3D] text-white pt-8 pb-16 px-4 md:px-8">
        <div className="max-w-[800px] mx-auto flex items-center gap-4">
          <button 
            onClick={() => router.back()} 
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
            title="Go back"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold font-sans tracking-tight">Add New Client</h1>
            <p className="text-white/80 text-sm mt-1">Create a profile and upload their trading data</p>
          </div>
        </div>
      </div>

      <div className="max-w-[800px] mx-auto px-4 md:px-8 -mt-8 relative z-10">
        <Card className="shadow-lg border-[#EDE0E6]">
          <CardHeader className="bg-white border-b border-[#EDE0E6]">
            <CardTitle className="text-[#1A0A10] text-lg">Client Details</CardTitle>
            <CardDescription>Enter the client&apos;s information and upload their P&amp;L Excel file.</CardDescription>
          </CardHeader>
          <CardContent className="p-6 bg-white">
            <form onSubmit={handleSubmit} className="space-y-6">
              
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
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Yash Patel"
                    className="w-full p-3 rounded-xl border border-[#EDE0E6] bg-[#F8F4F6]/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#8B0A3D]/20 focus:border-[#8B0A3D] transition-all"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-bold text-[#1A0A10]">Mobile Number</label>
                  <input 
                    type="tel" 
                    value={mobile}
                    onChange={handleMobileChange}
                    placeholder="e.g. +91 9876543210"
                    className="w-full p-3 rounded-xl border border-[#EDE0E6] bg-[#F8F4F6]/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#8B0A3D]/20 focus:border-[#8B0A3D] transition-all"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-[#1A0A10]">Email Address</label>
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. client@example.com"
                  className="w-full p-3 rounded-xl border border-[#EDE0E6] bg-[#F8F4F6]/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#8B0A3D]/20 focus:border-[#8B0A3D] transition-all"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-[#1A0A10]">Upload Excel File (.xlsx)</label>
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed border-[#D2C5CB] rounded-xl bg-[#F8F4F6]/50 hover:bg-[#F3E8EC] transition-colors relative">
                  <div className="space-y-2 text-center">
                    {file ? (
                      <div className="flex flex-col items-center">
                        <FileSpreadsheet className="mx-auto h-10 w-10 text-[#16A34A]" />
                        <span className="mt-2 block text-sm font-medium text-[#1A0A10]">{file.name}</span>
                        <button 
                          type="button" 
                          onClick={() => setFile(null)} 
                          className="text-xs text-[#DC2626] font-semibold mt-1 hover:underline"
                        >
                          Remove file
                        </button>
                      </div>
                    ) : (
                      <>
                        <Upload className="mx-auto h-10 w-10 text-[#9B8A92]" />
                        <div className="flex text-sm text-[#6B4A58] justify-center">
                          <label htmlFor="file-upload" className="relative cursor-pointer rounded-md font-bold text-[#8B0A3D] hover:text-[#C0392B] focus-within:outline-none">
                            <span>Upload a file</span>
                            <input id="file-upload" name="file-upload" type="file" className="sr-only" accept=".xlsx" onChange={handleFileChange} />
                          </label>
                          <p className="pl-1">or drag and drop</p>
                        </div>
                        <p className="text-xs text-[#9B8A92]">
                          Must contain expected headers (DATE, NET MARGIN, etc.)
                        </p>
                      </>
                    )}
                  </div>
                </div>
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
      </div>
    </div>
  );
}
