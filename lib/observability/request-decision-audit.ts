import { isRequestDecisionAuditEnabled } from "@/lib/observability/config";
import type { RuntimeSource } from "@/lib/decision/request-context";

export type DecisionAuditEventType = "decision" | "mismatch" | "aligned";

export type DecisionAuditEvent = {
  type: DecisionAuditEventType;
  decisionKind: "cache" | "delivery" | "route";
  route: string;
  method: string;
  runtimeSource: RuntimeSource;
  edgeHint?: string;
  serverValue?: string;
  ctxFingerprint?: string;
  at: number;
};

const RING_SIZE = 100;

let mismatchCount = 0;
let alignedCount = 0;
const events: DecisionAuditEvent[] = [];

function pushEvent(event: DecisionAuditEvent): void {
  if (!isRequestDecisionAuditEnabled()) return;
  events.push(event);
  if (events.length > RING_SIZE) events.shift();
}

export function recordDecisionAudit(input: Omit<DecisionAuditEvent, "at" | "type"> & { type?: DecisionAuditEventType }): void {
  if (!isRequestDecisionAuditEnabled()) return;
  pushEvent({ ...input, type: input.type ?? "decision", at: Date.now() });
}

export function recordDecisionMismatch(input: {
  decisionKind: "cache" | "delivery" | "route";
  route: string;
  method: string;
  runtimeSource: RuntimeSource;
  edgeHint: string;
  serverValue: string;
  ctxFingerprint: string;
}): void {
  if (!isRequestDecisionAuditEnabled()) return;
  mismatchCount += 1;
  pushEvent({
    type: "mismatch",
    decisionKind: input.decisionKind,
    route: input.route,
    method: input.method,
    runtimeSource: input.runtimeSource,
    edgeHint: input.edgeHint,
    serverValue: input.serverValue,
    ctxFingerprint: input.ctxFingerprint,
    at: Date.now(),
  });
  console.warn("[RDR] mismatch", {
    kind: input.decisionKind,
    route: input.route,
    edge: input.edgeHint,
    server: input.serverValue,
  });
}

export function recordDecisionAligned(input: {
  decisionKind: "cache" | "delivery" | "route";
  route: string;
  method: string;
  runtimeSource: RuntimeSource;
  value: string;
  ctxFingerprint: string;
}): void {
  if (!isRequestDecisionAuditEnabled()) return;
  alignedCount += 1;
  pushEvent({
    type: "aligned",
    decisionKind: input.decisionKind,
    route: input.route,
    method: input.method,
    runtimeSource: input.runtimeSource,
    serverValue: input.value,
    ctxFingerprint: input.ctxFingerprint,
    at: Date.now(),
  });
}

export function getDecisionMismatchCount(): number {
  return mismatchCount;
}

export function getDecisionAlignedCount(): number {
  return alignedCount;
}

export function getDecisionAuditEvents(): readonly DecisionAuditEvent[] {
  return events;
}

export function resetDecisionAudit(): void {
  mismatchCount = 0;
  alignedCount = 0;
  events.length = 0;
}
