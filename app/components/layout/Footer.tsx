"use client";

import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="w-full bg-[#0F0208] text-white/90 py-10 px-6 md:px-10 font-sans mt-auto select-none border-t border-rcg-maroonDark/40">
      <div className="max-w-[1400px] mx-auto space-y-8">
        
        {/* Top Header Row */}
        <div className="flex flex-col md:flex-row justify-between gap-8 border-b border-white/10 pb-8">
          {/* Logo & Brand */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <img 
                src="/logo.png" 
                alt="Rising Capital Group" 
                className="h-10 w-auto object-contain brightness-0 invert" 
              />
            </div>
            <div className="text-[11px] text-white/40 font-mono leading-relaxed mt-2">
              <div>NSE F&O</div>
              <div>NIFTY Options</div>
            </div>
          </div>
          
          {/* Contact / Address Info */}
          <div className="flex flex-col md:items-end text-left md:text-right gap-2 text-white/70 text-xs">
            <span className="font-bold text-white uppercase tracking-wider text-[11px]">Contact Us</span>
            <p className="max-w-md text-white/50 leading-relaxed">
              Unit no :- P03-02A&B, 3rd Floor, Tower A, WTC Gift City, Block No 51, Road 5E, Zone-5 Gift City, Gandhinagar, Gujarat
            </p>
            <div className="flex flex-col md:items-end gap-1 mt-1 text-white/50 font-mono text-[11px]">
              <span>Phone: +91 9316597989</span>
              <span>Email: info@risingcapitalgroup.in</span>
            </div>
          </div>
        </div>

        {/* Brand Slogan */}
        <div className="py-2 text-center">
          <p className="text-[17px] font-light italic text-white/90 font-sans tracking-wide">
            &ldquo;Trust the data. Question the narrative.&rdquo;
          </p>
          <p className="text-xs font-bold text-[#8B0A3D] mt-1.5 uppercase tracking-widest font-sans">
            — Rising Capital Group
          </p>
        </div>

        {/* Bottom Row */}
        <div className="border-t border-white/10 pt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-[10.5px] text-white/30">
          <span>&copy; {new Date().getFullYear()} Rising Capital Group. All rights reserved.</span>
          <a 
            href="https://risingcapitalgroup.in/" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="hover:text-[#C41E5A] transition-colors font-medium underline underline-offset-2"
          >
            risingcapitalgroup.in
          </a>
        </div>

      </div>
    </footer>
  );
};

export default Footer;
