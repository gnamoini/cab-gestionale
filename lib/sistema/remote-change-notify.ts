/** Dedup notifiche toast per cambi remoti (settings, conflitti, ecc.). */

type NotifyEntry = { at: number };

const recent = new Map<string, NotifyEntry>();
const DEFAULT_COOLDOWN_MS = 10_000;
const PRUNE_MS = 60_000;

function prune(now: number): void {
  for (const [k, v] of recent) {
    if (now - v.at > PRUNE_MS) recent.delete(k);
  }
}

export function shouldNotifyRemoteChange(
  fingerprint: string,
  cooldownMs = DEFAULT_COOLDOWN_MS,
): boolean {
  const now = Date.now();
  prune(now);
  const prev = recent.get(fingerprint);
  if (prev && now - prev.at < cooldownMs) return false;
  recent.set(fingerprint, { at: now });
  return true;
}

export function resetRemoteChangeNotify(fingerprint?: string): void {
  if (fingerprint) recent.delete(fingerprint);
  else recent.clear();
}
