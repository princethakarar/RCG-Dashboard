"use client";
/* eslint-disable @typescript-eslint/no-unused-vars */

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { usePortfolio } from '../../hooks/usePortfolioData';
import { formatDate, formatDateFull } from '../../lib/formatters';
import { Badge } from '../ui/badge';
import { Menu, X, CircleUserRound, LogOut, ChevronDown } from 'lucide-react';

import Image from 'next/image';

export const TopNav: React.FC = () => {
  const pathname = usePathname();
  const { metrics: metrics3x, netAssetMetrics, data: data3x, netAssetData } = usePortfolio();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isNetAsset = pathname === '/net-asset';
  const metrics = isNetAsset ? netAssetMetrics : metrics3x;
  const data = isNetAsset ? netAssetData : data3x;

  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch session email on mount
  useEffect(() => {
    let active = true;
    const fetchSession = async () => {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          if (active && data.email) {
            setUserEmail(data.email);
          }
        }
      } catch (err) {
        console.error('Failed to fetch session email:', err);
      }
    };
    fetchSession();
    return () => {
      active = false;
    };
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Handle logout
  const handleLogout = async () => {
    try {
      const res = await fetch('/api/auth/logout', { method: 'POST' });
      if (res.ok) {
        window.location.href = '/login';
      } else {
        console.error('Failed to log out');
      }
    } catch (err) {
      console.error('Error logging out:', err);
    }
  };

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
    { name: 'Rising Alpha Creator Portfolio 3x', path: '/intern-portfolio' },
    { name: 'Rising Alpha Creator Portfolio Net Asset', path: '/net-asset' },
    { name: 'Strategies', path: '/strategies' },
    { name: 'Statistics', path: '/admin/statistics' },
    { name: 'Upload Data', path: '/upload' },
  ];

  const checkActive = (path: string) => {
    if (path === '/intern-portfolio') {
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

        {/* Center: Navigation Links (Desktop) */}
        <nav className="hidden xl:flex items-center gap-0.5 xl:gap-1.5 min-w-0 overflow-hidden">
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

        {/* Right Area: Badges, Profile, and Mobile Hamburger Controls */}
        <div className="flex items-center gap-2 md:gap-3 shrink-0 relative">
          {/* Desktop Date badge */}
          {data.length > 0 && metrics && (
            <div className="hidden xl:block">
              <Badge variant="outline" className="border-[#8B0A3D] text-[#8B0A3D] font-semibold text-[11px] px-3 py-1 whitespace-nowrap">
                {getDateRangeStr()}
              </Badge>
            </div>
          )}

          {/* Mobile/Tablet Date badge */}
          {data.length > 0 && metrics && (
            <div className="block xl:hidden">
              <Badge
                variant="outline"
                className="border-[#8B0A3D] text-[#8B0A3D] font-semibold text-[10px] px-2 py-0.5 whitespace-nowrap"
              >
                {getDateRangeStrShort()}
              </Badge>
            </div>
          )}

          {/* Profile Dropdown (Temporarily Hidden) */}
          {/*
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-1 p-1.5 rounded-xl text-[#6B4A58] hover:text-[#8B0A3D] hover:bg-[#F8F4F6]/50 transition-colors focus:outline-none"
              aria-label="User Profile"
              aria-haspopup="true"
              aria-expanded={dropdownOpen}
            >
              <CircleUserRound size={22} className="shrink-0" />
              <ChevronDown size={14} className={`shrink-0 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-white border border-[#EDE0E6] rounded-2xl shadow-[0_10px_25px_-5px_rgba(139,10,61,0.08),0_8px_16px_-6px_rgba(139,10,61,0.04)] py-3 z-50 animate-in fade-in slide-in-from-top-2 duration-150 origin-top-right">
                <div className="px-4 py-2 border-b border-[#EDE0E6] mb-2">
                  <p className="text-[10px] font-bold text-[#9B8A92] uppercase tracking-wider">Signed In As</p>
                  <p className="text-xs font-semibold text-[#1A0A10] truncate mt-0.5" title={userEmail || 'Loading...'}>
                    {userEmail || 'Loading...'}
                  </p>
                </div>
                
                <div className="px-2">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-[#6B4A58] hover:text-[#8B0A3D] hover:bg-[#F8F4F6] rounded-xl transition-colors text-left"
                  >
                    <LogOut size={15} className="shrink-0 text-[#9B8A92]" />
                    <span>Logout</span>
                  </button>
                </div>
              </div>
            )}
          </div>
          */}

          {/* Mobile/Tablet: Hamburger Menu Button */}
          <div className="flex xl:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-1.5 rounded-lg text-[#6B4A58] hover:text-[#1A0A10] hover:bg-[#F8F4F6] transition-colors focus:outline-none"
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

      </div>

      {/* Mobile/Tablet Drawer */}
      {mobileMenuOpen && (
        <div className="xl:hidden absolute top-16 left-0 w-full bg-white border-b border-rcg-border shadow-lg z-50 flex flex-col py-3 px-4 gap-1">
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
