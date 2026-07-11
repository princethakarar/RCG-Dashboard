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
