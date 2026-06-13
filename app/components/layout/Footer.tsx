"use client";

import React from 'react';
import Image from 'next/image';

export const Footer: React.FC = () => {
  return (
    <footer 
      className="w-full py-12 px-6 md:px-10 font-sans mt-auto select-none border-t"
      style={{ 
        backgroundColor: '#0F0208', 
        borderColor: 'rgba(196, 30, 90, 0.25)',
      }}
    >
      <div className="max-w-[1400px] mx-auto space-y-10">
        
        {/* Top Header Row */}
        <div 
          className="flex flex-col md:flex-row justify-between gap-8 pb-8 border-b"
          style={{ borderColor: 'rgba(255, 255, 255, 0.1)' }}
        >
          {/* Logo & Brand */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <Image 
                src="/logo.png" 
                alt="Rising Capital Group" 
                width={180}
                height={65}
                className="h-14 w-auto object-contain brightness-0 invert" 
              />
            </div>
            <div 
              className="text-[12px] font-semibold tracking-wider uppercase font-mono mt-3 space-y-1"
              style={{ color: '#C494A8' }}
            >
              <div>NSE F&O Partner</div>
              <div>NIFTY Options Desk</div>
            </div>
          </div>
          
          {/* Contact / Address Info */}
          <div className="flex flex-col md:items-end text-left md:text-right gap-2">
            <span 
              className="font-extrabold uppercase tracking-widest text-[12px]"
              style={{ color: '#FFAEC9' }}
            >
              Contact Us
            </span>
            <p 
              className="max-w-md text-xs leading-relaxed font-medium"
              style={{ color: '#EADCE3' }}
            >
              Unit no :- P03-02A&B, 3rd Floor, Tower A, WTC Gift City, Block No 51, Road 5E, Zone-5 Gift City, Gandhinagar, Gujarat
            </p>
            <div 
              className="flex flex-col md:items-end gap-1.5 mt-2 font-mono text-[12px] font-semibold"
              style={{ color: '#C494A8' }}
            >
              <span>Phone: +91 9316597989</span>
              <span>Email: info@risingcapitalgroup.in</span>
            </div>
          </div>
        </div>

        {/* Brand Slogan */}
        <div className="py-2 text-center">
          <p 
            className="text-[18px] font-light italic tracking-wide"
            style={{ color: '#FFFFFF' }}
          >
            &ldquo;Don't follow us—follow the process. Don't believe opinions—believe the data. Anyone can trade, but only a few have the discipline to follow the process.&rdquo;
          </p>
          <p 
            className="text-[11px] font-black mt-2 uppercase tracking-[0.25em]"
            style={{ color: '#FFAEC9' }}
          >
            — Rising Capital Group
          </p>
        </div>

        {/* Bottom Row */}
        <div 
          className="pt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-[11px] border-t font-medium"
          style={{ 
            borderColor: 'rgba(255, 255, 255, 0.1)',
            color: '#9E8592'
          }}
        >
          <span>&copy; {new Date().getFullYear()} Rising Capital Group. All rights reserved.</span>
          <a 
            href="https://risingcapitalgroup.in/" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="transition-colors underline underline-offset-4 hover:brightness-125"
            style={{ color: '#FF4A85' }}
          >
            risingcapitalgroup.in
          </a>
        </div>

      </div>
    </footer>
  );
};

export default Footer;
