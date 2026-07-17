import type { AiKeyStatus, ResolvedAiKey } from "@/lib/ai/runtime/types";

function isKeySelectable(key: ResolvedAiKey, now = Date.now()): boolean {
  if (key.status === "invalid" || key.status === "disabled") return false;
  if (key.cooldownUntil && key.cooldownUntil.getTime() > now) return false;
  return true;
}

function successRate(key: ResolvedAiKey): number {
  if (key.requestsTotal <= 0) return 1;
  return key.successTotal / key.requestsTotal;
}

/** ponytail: weighted score — upgrade path: external policy plugin */
export function scoreKey(key: ResolvedAiKey): number {
  const rate = successRate(key);
  const latencyPenalty = key.latencyMsAvg != null ? Math.min(key.latencyMsAvg / 10_000, 0.3) : 0;
  const cooldownPenalty = key.status === "cooldown" || key.status === "rate_limited" ? 0.5 : 0;
  return key.weight * rate - key.priority * 0.01 - latencyPenalty - cooldownPenalty;
}

export function selectBestKey(keys: readonly ResolvedAiKey[]): ResolvedAiKey | null {
  const eligible = keys.filter((k) => isKeySelectable(k));
  if (eligible.length === 0) return null;
  return [...eligible].sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    const scoreDiff = scoreKey(b) - scoreKey(a);
    if (scoreDiff !== 0) return scoreDiff;
    const aUsed = a.lastUsedAt?.getTime() ?? 0;
    const bUsed = b.lastUsedAt?.getTime() ?? 0;
    return aUsed - bUsed;
  })[0]!;
}

export function orderKeysForFailover(keys: readonly ResolvedAiKey[], first: ResolvedAiKey): ResolvedAiKey[] {
  const rest = keys.filter((k) => k.id !== first.id && isKeySelectable(k));
  return [first, ...rest.sort((a, b) => a.priority - b.priority || scoreKey(b) - scoreKey(a))];
}

export function mapErrorToKeyStatus(code: string): AiKeyStatus {
  if (code === "AI_KEY_INVALID") return "invalid";
  if (code === "AI_RATE_LIMIT" || code === "AI_QUOTA_EXCEEDED") return "cooldown";
  if (code === "AI_PROVIDER_DOWN" || code === "AI_TIMEOUT") return "degraded";
  return "degraded";
}

export function cooldownSecondsForError(code: string): number {
  if (code === "AI_RATE_LIMIT") return 120;
  if (code === "AI_QUOTA_EXCEEDED") return 300;
  return 60;
}
