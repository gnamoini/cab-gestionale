export type RuntimeHealthSnapshot = {
  at: string;
  counters: Record<string, number>;
  metrics: Record<string, { lastMs: number; samples: number }>;
};

const MAX_COUNTERS = 30;
const WINDOW_MS = 60_000;

const counters = new Map<string, { count: number; windowStart: number }>();
const metrics = new Map<string, { lastMs: number; samples: number; sumMs: number }>();

function pruneCounters(now: number): void {
  for (const [key, entry] of counters) {
    if (now - entry.windowStart > WINDOW_MS) counters.delete(key);
  }
  if (counters.size > MAX_COUNTERS) {
    const keys = [...counters.keys()].slice(0, counters.size - MAX_COUNTERS);
    for (const k of keys) counters.delete(k);
  }
}

/** Incrementa contatore rolling (finestra 60s). */
export function incrementHealthCounter(name: string, delta = 1): void {
  const now = Date.now();
  pruneCounters(now);
  const prev = counters.get(name);
  if (!prev || now - prev.windowStart > WINDOW_MS) {
    counters.set(name, { count: delta, windowStart: now });
    return;
  }
  prev.count += delta;
}

/** Registra metrica latency (ultimo valore + campioni nella finestra). */
export function recordHealthMetric(name: string, valueMs: number): void {
  const now = Date.now();
  pruneCounters(now);
  const prev = metrics.get(name);
  if (!prev) {
    metrics.set(name, { lastMs: valueMs, samples: 1, sumMs: valueMs });
    return;
  }
  prev.lastMs = valueMs;
  prev.samples += 1;
  prev.sumMs += valueMs;
}

export function getRuntimeHealthSnapshot(): RuntimeHealthSnapshot {
  const counterOut: Record<string, number> = {};
  for (const [k, v] of counters) counterOut[k] = v.count;

  const metricOut: Record<string, { lastMs: number; samples: number }> = {};
  for (const [k, v] of metrics) {
    metricOut[k] = { lastMs: v.lastMs, samples: v.samples };
  }

  return {
    at: new Date().toISOString(),
    counters: counterOut,
    metrics: metricOut,
  };
}
