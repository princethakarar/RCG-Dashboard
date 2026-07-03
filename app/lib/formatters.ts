// Indian currency format: Lakh/Crore for large values (>1L), K for >1K, round otherwise
export const formatINR = (value: number): string => {
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  if (abs >= 10000000) return `${sign}₹${(abs / 10000000).toFixed(2)}Cr`;
  if (abs >= 100000) return `${sign}₹${(abs / 100000).toFixed(2)}L`;
  if (abs >= 1000) return `${sign}₹${(abs / 1000).toFixed(1)}K`;
  return `${sign}₹${Math.round(abs)}`;
};

// Format percent value with sign (+ or -)
export const formatPct = (value: number, decimals = 2): string => {
  if (value === 0) return '0.00%';
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(decimals)}%`;
};

// Format date string 'YYYY-MM-DD' to 'DD Mon' (e.g. '04 May')
export const formatDate = (dateStr: string): string => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  const date = new Date(year, month, day);
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
};

// Format date string 'YYYY-MM-DD' to 'DD Mon YYYY' (e.g. '10 Jun 2026')
export const formatDateFull = (dateStr: string): string => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  const date = new Date(year, month, day);
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

// Format month key 'YYYY-MM' to 'Mon YYYY' (e.g. '2024-07' -> 'Jul 2024')
export const formatMonthYear = (monthKey: string): string => {
  if (!monthKey) return '';
  const parts = monthKey.split('-');
  if (parts.length !== 2) return monthKey;
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const date = new Date(year, month, 1);
  return date.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
};

// Color for graph lines/bars
export const pnlColor = (v: number) => v >= 0 ? '#16A34A' : '#DC2626';

// Tailwind text class for P&L values
export const pnlClass = (v: number) => v >= 0 ? 'text-green-600' : 'text-red-600';

// Tailwind background and border class for P&L status boxes
export const pnlBgClass = (v: number) => v >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200';

// Mask Indian Mobile Number (e.g. +91 XXXXXX7980 or 98XXXXXX45)
export const maskMobile = (mobile: string): string => {
  if (!mobile) return '';
  const clean = mobile.replace(/[^0-9+]/g, '');
  if (clean.length < 10) return mobile;
  
  // Show first 2 (if plain 10 digit) or first few (+91) and last 4
  const last4 = clean.slice(-4);
  const firstPart = clean.slice(0, clean.length - 10 + 2); // e.g. "+91 98"
  return `${firstPart}${'X'.repeat(4)}${last4}`;
};

// Mask Email Address (e.g. ya***@gmail.com)
export const maskEmail = (email: string): string => {
  if (!email || !email.includes('@')) return email;
  const [local, domain] = email.split('@');
  if (local.length <= 2) {
    return `${local}***@${domain}`;
  }
  const first2 = local.slice(0, 2);
  return `${first2}${'*'.repeat(Math.max(1, local.length - 2))}@${domain}`;
};
