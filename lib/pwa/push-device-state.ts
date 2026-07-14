export const PWA_PUSH_DEVICE_STATE_KEY = "cab-pwa-push-state-v1" as const;

export type PwaPushDeviceState = {
  enabled: boolean;
  dismissedUntil: number;
  lastSubscriptionSync: number;
};

const DEFAULT_STATE: PwaPushDeviceState = {
  enabled: true,
  dismissedUntil: 0,
  lastSubscriptionSync: 0,
};

export function readPwaPushDeviceState(): PwaPushDeviceState {
  if (typeof localStorage === "undefined") return { ...DEFAULT_STATE };
  try {
    const raw = localStorage.getItem(PWA_PUSH_DEVICE_STATE_KEY);
    if (!raw) return { ...DEFAULT_STATE };
    const parsed = JSON.parse(raw) as Partial<PwaPushDeviceState>;
    return {
      enabled: parsed.enabled !== false,
      dismissedUntil: Number(parsed.dismissedUntil) || 0,
      lastSubscriptionSync: Number(parsed.lastSubscriptionSync) || 0,
    };
  } catch {
    return { ...DEFAULT_STATE };
  }
}

export function writePwaPushDeviceState(patch: Partial<PwaPushDeviceState>): PwaPushDeviceState {
  const next = { ...readPwaPushDeviceState(), ...patch };
  if (typeof localStorage !== "undefined") {
    try {
      localStorage.setItem(PWA_PUSH_DEVICE_STATE_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }
  return next;
}

export function isPwaPushDeviceEnabled(): boolean {
  return readPwaPushDeviceState().enabled;
}
