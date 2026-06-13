"use client";

import React from 'react';
import { usePortfolio } from '../hooks/usePortfolioData';
import { TopNav } from '../components/layout/TopNav';
import { Footer } from '../components/layout/Footer';
import { UploadZone } from '../components/upload/UploadZone';

export default function UploadPage() {
  const { files, refetch } = usePortfolio();

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Sticky Top Navigation */}
      <TopNav />

      {/* Main Content Area */}
      <main className="flex-1 px-6 md:px-10 py-10 max-w-3xl w-full mx-auto space-y-6 select-none">
        
        {/* Header Description */}
        <div className="pb-4 border-b border-rcg-border/60 font-sans">
          <h1 className="text-xl font-extrabold text-[#1A0A10] tracking-tight">
            Upload Portfolio Data Files
          </h1>
          <p className="text-xs font-semibold text-[#9B8A92] mt-1 leading-relaxed">
            Drop your Performance P&amp;L Excel files here. Files are saved in the private data folder and the dashboard updates automatically.
          </p>
        </div>

        {/* Upload Area & File Listing */}
        <UploadZone 
          files={files} 
          onUploadSuccess={() => {
            // Immediate refetch
            refetch();
            // Safety-net second refetch after 3s to catch Vercel Blob propagation delay
            setTimeout(() => refetch(), 3000);
          }} 
        />

      </main>

      {/* Dark Institutional Footer */}
      <Footer />
    </div>
  );
}
