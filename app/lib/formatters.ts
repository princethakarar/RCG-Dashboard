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

// Color for graph lines/bars
export const pnlColor = (v: number) => v >= 0 ? '#16A34A' : '#DC2626';

// Tailwind text class for P&L values
export const pnlClass = (v: number) => v >= 0 ? 'text-green-600' : 'text-red-600';

// Tailwind background and border class for P&L status boxes
export const pnlBgClass = (v: number) => v >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200';
