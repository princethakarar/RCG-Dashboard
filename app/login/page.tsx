'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Eye, EyeOff, Lock, Mail, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Invalid credentials');
      }

      // Successful login, force hard redirect to ensure cookies propagate and client cache is cleared
      window.location.href = '/intern-portfolio';
    } catch (err: unknown) {
      setError((err as Error).message || 'Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-[#FFFFFF] p-4 relative font-sans">
      
      {/* Centered Single White Card */}
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
              Welcome Back
            </h1>
            <p className="text-xs text-[#9B8A92] mt-1.5">
              Login to access our dashboard.
            </p>
          </div>

          {/* Inline Error Message (Badge/Pill style) */}
          {error && (
            <div className="w-full mb-6 bg-[#FEF2F2] rounded-lg py-2.5 px-3.5 flex items-center text-[#DC2626]">
              <p className="text-xs font-semibold">
                {error}
              </p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="w-full space-y-4">
            
            {/* Email Field */}
            <div className="space-y-1.5">
              <label 
                htmlFor="email" 
                className="block text-[11px] font-bold text-[#6B4A58] uppercase tracking-[0.05em]"
              >
                Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 text-[#9B8A92]" />
                </div>
                <input
                  id="email"
                  type="email"
                  required
                  placeholder="name@risingcapital.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-white border border-[#EDE0E6] rounded-md text-sm text-[#1A0A10] placeholder-[#9B8A92] focus:outline-none focus:ring-2 focus:ring-[#C41E5A]/20 focus:border-[#C41E5A] transition-all duration-200"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <label 
                htmlFor="password" 
                className="block text-[11px] font-bold text-[#6B4A58] uppercase tracking-[0.05em]"
              >
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-[#9B8A92]" />
                </div>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-10 py-2 bg-white border border-[#EDE0E6] rounded-md text-sm text-[#1A0A10] placeholder-[#9B8A92] focus:outline-none focus:ring-2 focus:ring-[#C41E5A]/20 focus:border-[#C41E5A] transition-all duration-200"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#9B8A92] hover:text-[#6B4A58] focus:outline-none transition-colors"
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

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center py-2 px-4 border border-transparent rounded-md text-sm font-bold text-white bg-[#8B0A3D] hover:bg-[#C41E5A] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#8B0A3D] transition-all duration-200 disabled:opacity-75 disabled:cursor-not-allowed select-none active:scale-[0.98] mt-2"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                  Authenticating...
                </>
              ) : (
                'Login'
              )}
            </button>

          </form>

        </div>
      </div>
      
      {/* Footer Below the Card */}
      <div className="mt-6 text-center">
        <p className="text-[11px] text-[#9B8A92] tracking-wider">
          © 2026 Rising Capital Group. All rights reserved.
        </p>
      </div>
    </main>
  );
}
