// Per-strategy access control. A `null` entry means unrestricted (visible to
// everyone). A string array restricts visibility/usage to those emails only.
export const STRATEGY_ACCESS_CONFIG: Record<string, string[] | null> = {
  '3 Red Candle': null,
  'Soldier Pattern': null,
  'Hybrid Adaptive Options Framework': ['milanpatelrising1@gmail.com'],
};

export function isStrategyVisibleToUser(strategyKey: string, userEmail?: string | null): boolean {
  const allowed = STRATEGY_ACCESS_CONFIG[strategyKey];
  if (!allowed) return true;
  if (!userEmail) return false;
  const normalizedEmail = userEmail.trim().toLowerCase();
  return allowed.some(e => e.toLowerCase() === normalizedEmail);
}
