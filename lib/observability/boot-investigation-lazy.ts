/**
 * Lazy facades — critical shell imports this file only (not boot-investigation.ts).
 */
import { isBootInvestigationEnabled } from "@/lib/observability/boot-investigation-gate";
import type { BootInvestigationTag, QueryEventPhase } from "@/lib/observability/boot-investigation";

type BootMod = typeof import("@/lib/observability/boot-investigation");

let bootModPromise: Promise<BootMod> | null = null;

function loadBootMod(): Promise<BootMod> {
  if (!bootModPromise) {
    bootModPromise = import("@/lib/observability/boot-investigation");
  }
  return bootModPromise;
}

export function lazyLogBoot(
  tag: BootInvestigationTag,
  component: string,
  meta?: Record<string, unknown>,
  detail?: string,
): void {
  if (!isBootInvestigationEnabled()) return;
  void loadBootMod().then((m) => m.logBoot(tag, component, meta, detail));
}

export function lazyTrackRedirect(
  from: string,
  to: string,
  reason: string,
  source: "edge" | "auth_gate" | "rbac" | "router",
): void {
  if (!isBootInvestigationEnabled()) return;
  void loadBootMod().then((m) => m.trackRedirect(from, to, reason, source));
}

export function lazyTrackStoreUpdate(
  storeId: string,
  prev: unknown,
  next: unknown,
  meta?: Record<string, unknown>,
): void {
  if (!isBootInvestigationEnabled()) return;
  void loadBootMod().then((m) => m.trackStoreUpdate(storeId, prev, next, meta));
}

export function lazyTrackQueryEvent(
  phase: QueryEventPhase,
  queryKey: unknown,
  meta?: Record<string, unknown>,
): void {
  if (!isBootInvestigationEnabled()) return;
  void loadBootMod().then((m) => m.trackQueryEvent(phase, queryKey, meta));
}

export function lazyCountRender(componentId: string, phase?: string): void {
  if (!isBootInvestigationEnabled()) return;
  void loadBootMod().then((m) => m.countRender(componentId, phase));
}

export function lazyLogBootServer(
  tag: BootInvestigationTag,
  component: string,
  meta?: Record<string, unknown>,
  detail?: string,
): void {
  if (!isBootInvestigationEnabled()) return;
  void loadBootMod().then((m) => m.logBootServer(tag, component, meta, detail));
}

export async function loadBootInvestigationMod(): Promise<BootMod> {
  return loadBootMod();
}
