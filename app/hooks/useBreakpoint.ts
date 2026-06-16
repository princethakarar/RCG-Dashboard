"use client";

import { useState, useEffect } from 'react';

export type Breakpoint = 'mobile' | 'tablet' | 'desktop';

export function useBreakpoint(): Breakpoint {
  const [breakpoint, setBreakpoint] = useState<Breakpoint>('desktop');

  useEffect(() => {
    const check = () => {
      const w = window.innerWidth;
      if (w <= 480) setBreakpoint('mobile');
      else if (w <= 768) setBreakpoint('tablet');
      else setBreakpoint('desktop');
    };
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  return breakpoint;
}

export function getXAxisTickInterval(dataLength: number, breakpoint: Breakpoint): number | 'preserveStartEnd' {
  if (breakpoint === 'mobile') {
    return Math.max(0, Math.floor(dataLength / 6) - 1);
  }
  if (breakpoint === 'tablet') {
    return Math.max(0, Math.floor(dataLength / 8) - 1);
  }
  return 'preserveStartEnd';
}

export function getChartTickFontSize(breakpoint: Breakpoint): number {
  return breakpoint === 'mobile' ? 10 : 11;
}
