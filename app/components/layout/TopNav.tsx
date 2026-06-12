"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { usePortfolio } from '../../hooks/usePortfolioData';
import { formatDate, formatDateFull } from '../../lib/formatters';
import { Badge } from '../ui/badge';
import { Menu, X } from 'lucide-react';

import Image from 'next/image';

export const TopNav: React.FC = () => {
  const pathname = usePathname();
  const { metrics: metrics3x, netAssetMetrics, data: data3x, netAssetData } = usePortfolio();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isNetAsset = pathname === '/net-asset';
  const metrics = isNetAsset ? netAssetMetrics : metrics3x;
  const data = isNetAsset ? netAssetData : data3x;

  // Formatting date range for the badge
  const getDateRangeStr = () => {
    if (!metrics) return "Loading Dates...";
    const start = formatDate(metrics.dateRange.from);
    const end = formatDateFull(metrics.dateRange.to);
    return `${start} – ${end}`;
  };

  const navItems = [
    { name: 'Dashboard', path: '/' },
    { name: 'Intern Portfolio 3x', path: '/intern-portfolio' },
    { name: 'Intern Portfolio Net Asset', path: '/net-asset' },
    { name: 'Upload Data', path: '/upload' },
  ];

  const checkActive = (path: string) => {
    if (path === '/') {
      return pathname === '/' || pathname === '/intern-portfolio';
    }
    return pathname === path;
  };

  return (
    <header className="sticky top-0 z-50 w-full h-20 bg-white/95 backdrop-blur-md border-b border-rcg-border select-none no-print">
      <div className="max-w-[1400px] h-full mx-auto px-6 flex items-center justify-between">
        
        {/* Left Section: Logo & Brand */}
        <Link href="/" className="flex items-center hover:opacity-90 transition-opacity">
          <Image src="/logo.png" alt="Rising Capital Group" width={180} height={56} className="h-14 w-auto object-contain" />
        </Link>

        {/* Center Section: Navigation Links (Desktop) */}
        <nav className="hidden md:flex items-center gap-2">
          {navItems.map((item) => {
            const isActive = checkActive(item.path);
            return (
              <Link
                key={item.name}
                href={item.path}
                className={`text-[13px] transition-all duration-200 px-4 py-2.5 rounded-xl font-sans font-semibold
                  ${isActive 
                    ? 'bg-[#F8F4F6] text-[#8B0A3D]' 
                    : 'text-[#6B4A58] hover:text-[#1A0A10] hover:bg-[#F8F4F6]/50'
                  }`}
              >
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Right Section: Badges & Profile (Desktop) */}
        <div className="hidden md:flex items-center gap-3">
          {data.length > 0 && metrics && (
            <Badge variant="outline" className="border-[#8B0A3D] text-[#8B0A3D] font-semibold text-[11px] px-3 py-1">
              {getDateRangeStr()}
            </Badge>
          )}
        </div>

        {/* Hamburger Menu Toggle (Mobile) */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-1.5 rounded-lg text-[#6B4A58] hover:text-[#1A0A10] hover:bg-[#F8F4F6] transition-colors"
        >
          {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>

      </div>

      {/* Mobile Drawer (Dropdown Menu) */}
      {mobileMenuOpen && (
        <div className="md:hidden absolute top-20 left-0 w-full bg-white border-b border-rcg-border shadow-lg z-50 flex flex-col py-3 px-6 gap-2">
          {navItems.map((item) => {
            const isActive = checkActive(item.path);
            return (
              <Link
                key={item.name}
                href={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`text-sm py-2 px-3 rounded-lg transition-colors font-sans
                  ${isActive
                    ? 'bg-[#F8F4F6] text-[#8B0A3D] font-bold'
                    : 'text-[#6B4A58] font-medium hover:bg-[#F8F4F6]/50'
                  }`}
              >
                {item.name}
              </Link>
            );
          })}
          {data.length > 0 && metrics && (
            <div className="border-t border-[#EDE0E6] my-2 pt-3 flex flex-col gap-2">
              <div className="text-[11px] font-semibold text-[#8B0A3D] bg-[#F8F4F6] px-3 py-1.5 rounded-lg text-center">
                {getDateRangeStr()}
              </div>
            </div>
          )}
        </div>
      )}
    </header>
  );
};

export default TopNav;
