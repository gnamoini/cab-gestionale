"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { getClientDeviceHints } from "@/lib/observability/client-device-hints";
import { RuntimeEvents, trackRuntimeEvent } from "@/lib/observability/events";

const GATE_STUCK_MS = 15_000;
const EMIT_COOLDOWN_MS = 30_000;

export type LoadingGateSnapshot = Record<string, boolean>;

/**
 * Emits `loading.gate.stuck` when any gate stays active beyond threshold.
 * Diagnostics only — does not change loading behavior.
 */
export function useLoadingGateTelemetry(
  gateName: string,
  gates: LoadingGateSnapshot,
  active: boolean,
): void {
  const pathname = usePathname() ?? "/";
  const startedRef = useRef<number | null>(null);
  const lastEmitRef = useRef(0);

  useEffect(() => {
    if (!active) {
      startedRef.current = null;
      return;
    }
    if (startedRef.current == null) {
      startedRef.current = Date.now();
    }

    const elapsed = Date.now() - startedRef.current;
    if (elapsed < GATE_STUCK_MS) return;
    if (Date.now() - lastEmitRef.current < EMIT_COOLDOWN_MS) return;

    const activeGates = Object.entries(gates)
      .filter(([, v]) => v)
      .map(([k]) => k);
    if (activeGates.length === 0) return;

    lastEmitRef.current = Date.now();
    const hints = getClientDeviceHints();
    trackRuntimeEvent(RuntimeEvents.loadingGateStuck, {
      durationMs: elapsed,
      gateName,
      activeGates,
      route: pathname,
      browser: hints.browser,
      hardwareConcurrency: hints.hardwareConcurrency,
      deviceMemory: hints.deviceMemory,
    });
  }, [active, gateName, gates, pathname]);
}
