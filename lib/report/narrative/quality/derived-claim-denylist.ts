/** Termini business derivativi — claim non tracciabili a payload.values. */
export const DERIVED_CLAIM_DENYLIST = [
  "redditività",
  "redditivita",
  "efficienza",
  "roi",
  "margine operativo",
  "margine",
  "produttività",
  "produttivita",
] as const;

/** Termini denylist ammessi quando il segnale li definisce esplicitamente (ruleKey SSOT). */
const DERIVED_TERM_ALLOWLIST_BY_RULE_KEY: Partial<Record<string, readonly string[]>> = {
  CROSS_EFFICIENCY: ["efficienza"],
};

function isDerivedTermAllowedForRule(term: string, ruleKey: string): boolean {
  const allowed = DERIVED_TERM_ALLOWLIST_BY_RULE_KEY[ruleKey];
  if (!allowed) return false;
  return allowed.some((entry) => term === entry || term.includes(entry) || entry.includes(term));
}

export function findDerivedClaimTerm(text: string, ruleKey?: string): string | null {
  const lower = text.toLowerCase();
  for (const term of DERIVED_CLAIM_DENYLIST) {
    if (ruleKey && isDerivedTermAllowedForRule(term, ruleKey)) continue;
    if (lower.includes(term)) return term;
  }
  return null;
}
