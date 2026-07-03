'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Eye, EyeOff, Lock, Loader2, ArrowLeft, CheckCircle2 } from 'lucide-react';

export default function ChangePasswordPage() {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      setLoading(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update password');
      }

      setSuccess('Password updated successfully. All active sessions have been invalidated. Redirecting to login...');
      
      // Auto logout and redirect to login page after 3 seconds
      setTimeout(async () => {
        try {
          await fetch('/api/auth/logout', { method: 'POST' });
        } catch {
          // Ignore logout error
        }
        window.location.href = '/login';
      }, 3000);

    } catch (err: unknown) {
      setError((err as Error).message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-[#FFFFFF] p-4 relative font-sans">
      
      {/* Centered White Card */}
      <div className="w-full max-w-[420px] bg-white border border-[#EDE0E6] rounded-xl shadow-[0_4px_20px_rgba(139,10,61,0.04)] overflow-hidden transition-all duration-300">
        
        <div className="p-8 sm:p-10 flex flex-col items-center">
          
          {/* Logo Lockup */}
          <div className="mb-8 flex items-center justify-center">
            <Image
              src="/logo.png"
              alt="Rising Capital Group"
              width={180}
              height={56}
              className="h-12 w-auto object-contain"
              priority
            />
          </div>

          {/* Heading */}
          <div className="text-center mb-6">
            <h1 className="text-xl font-bold tracking-tight text-[#1A0A10]">
              Rotate Portal Password
            </h1>
            <p className="text-xs text-[#9B8A92] mt-1.5">
              Change the shared password for all portal access.
            </p>
          </div>

          {/* Success State Pill */}
          {success && (
            <div className="w-full mb-6 bg-[#F0FDF4] rounded-lg py-3 px-3.5 flex items-start text-[#16A34A] border border-[#DCFCE7]">
              <CheckCircle2 className="h-4 w-4 text-[#16A34A] mr-2 shrink-0 mt-0.5" />
              <p className="text-xs font-semibold leading-relaxed">
                {success}
              </p>
            </div>
          )}

          {/* Error State Pill */}
          {error && (
            <div className="w-full mb-6 bg-[#FEF2F2] rounded-lg py-2.5 px-3.5 flex items-center text-[#DC2626]">
              <p className="text-xs font-semibold">
                {error}
              </p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="w-full space-y-4">
            
            {/* New Password Field */}
            <div className="space-y-1.5">
              <label 
                htmlFor="new-password" 
                className="block text-[11px] font-bold text-[#6B4A58] uppercase tracking-[0.05em]"
              >
                New Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-[#9B8A92]" />
                </div>
                <input
                  id="new-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="At least 6 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={!!success}
                  className="w-full pl-9 pr-10 py-2 bg-white border border-[#EDE0E6] rounded-md text-sm text-[#1A0A10] placeholder-[#9B8A92] focus:outline-none focus:ring-2 focus:ring-[#C41E5A]/20 focus:border-[#C41E5A] transition-all duration-200 disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={!!success}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#9B8A92] hover:text-[#6B4A58] focus:outline-none transition-colors disabled:opacity-50"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Confirm Password Field */}
            <div className="space-y-1.5">
              <label 
                htmlFor="confirm-password" 
                className="block text-[11px] font-bold text-[#6B4A58] uppercase tracking-[0.05em]"
              >
                Confirm New Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-[#9B8A92]" />
                </div>
                <input
                  id="confirm-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Re-enter new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={!!success}
                  className="w-full pl-9 pr-10 py-2 bg-white border border-[#EDE0E6] rounded-md text-sm text-[#1A0A10] placeholder-[#9B8A92] focus:outline-none focus:ring-2 focus:ring-[#C41E5A]/20 focus:border-[#C41E5A] transition-all duration-200 disabled:opacity-50"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || !!success}
              className="w-full flex items-center justify-center py-2 px-4 border border-transparent rounded-md text-sm font-bold text-white bg-[#8B0A3D] hover:bg-[#C41E5A] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#8B0A3D] transition-all duration-200 disabled:opacity-75 disabled:cursor-not-allowed select-none active:scale-[0.98] mt-2"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                  Updating Password...
                </>
              ) : (
                'Update Password'
              )}
            </button>

          </form>

          {/* Go Back Option */}
          {!success && (
            <button
              onClick={() => window.location.href = '/intern-portfolio'}
              className="mt-6 flex items-center text-xs font-semibold text-[#8B0A3D] hover:text-[#C41E5A] transition-colors"
            >
              <ArrowLeft className="h-3 w-3 mr-1" />
              Back to Dashboard
            </button>
          )}

        </div>
      </div>
      
      {/* Footer */}
      <div className="mt-6 text-center">
        <p className="text-[11px] text-[#9B8A92] tracking-wider">
          © 2026 Rising Capital Group. All rights reserved.
        </p>
      </div>
    </main>
  );
}
