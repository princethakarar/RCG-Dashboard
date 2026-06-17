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

  const getDateRangeStr = () => {
    if (!metrics) return "Loading Dates...";
    const start = formatDate(metrics.dateRange.from);
    const end = formatDateFull(metrics.dateRange.to);
    return `${start} – ${end}`;
  };

  const getDateRangeStrShort = () => {
    if (!metrics) return "Loading...";
    const start = formatDate(metrics.dateRange.from);
    const end = formatDate(metrics.dateRange.to);
    return `${start} – ${end}`;
  };

  const navItems = [
    { name: 'Dashboard', path: '/' },
    { name: 'Rising Alpha Creator Portfolio 3x', path: '/intern-portfolio' },
    { name: 'Rising Alpha Creator Portfolio Net Asset', path: '/net-asset' },
    { name: 'Upload Data', path: '/upload' },
  ];

  const checkActive = (path: string) => {
    if (path === '/') {
      return pathname === '/' || pathname === '/intern-portfolio';
    }
    return pathname === path;
  };

  const activeLinkClass = (isActive: boolean) =>
    isActive
      ? 'text-[#8B0A3D] font-bold relative after:absolute after:bottom-0 after:left-3 after:right-3 after:h-0.5 after:bg-[#C0392B]'
      : 'text-[#6B4A58] hover:text-[#1A0A10] hover:bg-[#F8F4F6]/50';

  return (
    <header className="sticky top-0 z-50 w-full h-16 md:h-20 bg-white/95 backdrop-blur-md border-b border-rcg-border select-none no-print">
      <div className="max-w-[1400px] h-full mx-auto px-4 md:px-6 flex items-center justify-between gap-2 md:gap-4">
        
        {/* Left: Logo */}
        <Link href="/" className="flex items-center hover:opacity-90 transition-opacity shrink-0">
          <Image
            src="/logo.png"
            alt="Rising Capital Group"
            width={180}
            height={56}
            className="h-10 md:h-14 w-auto object-contain"
          />
        </Link>

        {/* Center: Navigation Links (Desktop/Tablet) */}
        <nav className="hidden md:flex items-center gap-0.5 xl:gap-1.5 min-w-0 overflow-hidden">
          {navItems.map((item) => {
            const isActive = checkActive(item.path);
            return (
              <Link
                key={item.name}
                href={item.path}
                className={`text-[12px] xl:text-[13px] transition-all duration-200 px-2.5 xl:px-3 py-2 rounded-xl font-sans font-semibold shrink-0 ${activeLinkClass(isActive)}`}
              >
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Right: Date badge (Desktop) */}
        <div className="hidden md:flex items-center gap-3 shrink-0">
          {data.length > 0 && metrics && (
            <Badge variant="outline" className="border-[#8B0A3D] text-[#8B0A3D] font-semibold text-[11px] px-3 py-1 whitespace-nowrap">
              {getDateRangeStr()}
            </Badge>
          )}
        </div>

        {/* Mobile: Date + Hamburger */}
        <div className="flex md:hidden items-center gap-2 shrink-0">
          {data.length > 0 && metrics && (
            <Badge
              variant="outline"
              className="border-[#8B0A3D] text-[#8B0A3D] font-semibold text-[10px] px-2 py-0.5 whitespace-nowrap"
            >
              {getDateRangeStrShort()}
            </Badge>
          )}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1.5 rounded-lg text-[#6B4A58] hover:text-[#1A0A10] hover:bg-[#F8F4F6] transition-colors"
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden absolute top-16 left-0 w-full bg-white border-b border-rcg-border shadow-lg z-50 flex flex-col py-3 px-4 gap-1">
          {navItems.map((item) => {
            const isActive = checkActive(item.path);
            return (
              <Link
                key={item.name}
                href={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`text-sm py-2.5 px-3 rounded-lg transition-colors font-sans
                  ${isActive
                    ? 'text-[#8B0A3D] font-bold border-l-[3px] border-[#C0392B] bg-[#F8F4F6]'
                    : 'text-[#6B4A58] font-medium hover:bg-[#F8F4F6]/50'
                  }`}
              >
                {item.name}
              </Link>
            );
          })}
        </div>
      )}
    </header>
  );
};

export default TopNav;
