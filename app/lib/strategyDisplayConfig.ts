// Display-name overrides layered on top of stable strategy keys.
// Strategy keys here MUST match the literal values used for DB lookups,
// API params, and uploads (see app/api/strategy-data, app/api/upload/strategy).
export const STRATEGY_DISPLAY_CONFIG: Record<string, { default: string; overrides: Record<string, string> }> = {
  '3 Red Candle': {
    default: '3 Red Candle',
    overrides: {
      'milanpatelrising1@gmail.com': 'Delta Hedging Strategy',
    },
  },
  'Soldier Pattern': {
    default: 'Soldier Pattern',
    overrides: {
      'milanpatelrising1@gmail.com': 'Calendar Spread Strategy',
    },
  },
};

export function getStrategyDisplayName(strategyKey: string, userEmail?: string | null): string {
  const entry = STRATEGY_DISPLAY_CONFIG[strategyKey];
  if (!entry) return strategyKey;
  if (userEmail) {
    const match = Object.keys(entry.overrides).find(e => e.toLowerCase() === userEmail.trim().toLowerCase());
    if (match) return entry.overrides[match];
  }
  return entry.default;
}

// Appends " Strategy" for card titles like "3 Red Candle Strategy", but
// avoids the "Delta Hedging Strategy Strategy" tautology when the display
// name (e.g. a per-user override) already ends in the word "Strategy".
export function withStrategyLabel(displayName: string): string {
  return /strategy\s*$/i.test(displayName) ? displayName : `${displayName} Strategy`;
}
