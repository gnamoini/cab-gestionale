import { isQueryDedupAuditEnabled } from "@/lib/observability/config";
import type { DedupScope } from "@/lib/query/query-dedup-registry";

export type DedupAuditEventType = "hit" | "miss" | "duplicate_attempt" | "cross_component";

export type DedupAuditEvent = {
  type: DedupAuditEventType;
  queryKey: string;
  entityType?: string;
  entityId?: string;
  scope?: DedupScope;
  consumerTag?: string;
  otherTags?: string[];
  at: number;
};

const RING_SIZE = 100;

let dedupHits = 0;
let dedupMisses = 0;
let duplicateAttempts = 0;
let crossComponentReuse = 0;
const events: DedupAuditEvent[] = [];
const consumerTagsByKey = new Map<string, Set<string>>();

function pushEvent(event: DedupAuditEvent): void {
  if (!isQueryDedupAuditEnabled()) return;
  events.push(event);
  if (events.length > RING_SIZE) events.shift();
}

function formatKeyLabel(queryKey: string, entityType?: string, scope?: DedupScope): string {
  if (entityType) return `${entityType}${scope ? `:${scope}` : ""}`;
  return queryKey.slice(0, 80);
}

export function recordDedupHit(
  queryKey: readonly unknown[],
  meta?: { entityType?: string; entityId?: string; scope?: DedupScope; consumerTag?: string; otherTags?: string[] },
): void {
  if (!isQueryDedupAuditEnabled()) return;
  dedupHits += 1;
  const key = JSON.stringify(queryKey);
  pushEvent({
    type: "hit",
    queryKey: key,
    entityType: meta?.entityType,
    entityId: meta?.entityId,
    scope: meta?.scope,
    consumerTag: meta?.consumerTag,
    otherTags: meta?.otherTags,
    at: Date.now(),
  });
  const label = formatKeyLabel(key, meta?.entityType, meta?.scope);
  const tags = [meta?.consumerTag, ...(meta?.otherTags ?? [])].filter(Boolean).join(" + ");
  console.debug(`[Dedup] HIT ${label}${tags ? ` reused (${tags})` : ""}`);
}

export function recordDedupMiss(
  queryKey: readonly unknown[],
  meta?: { entityType?: string; entityId?: string; scope?: DedupScope; consumerTag?: string },
): void {
  if (!isQueryDedupAuditEnabled()) return;
  dedupMisses += 1;
  const key = JSON.stringify(queryKey);
  pushEvent({
    type: "miss",
    queryKey: key,
    entityType: meta?.entityType,
    entityId: meta?.entityId,
    scope: meta?.scope,
    consumerTag: meta?.consumerTag,
    at: Date.now(),
  });
  const label = formatKeyLabel(key, meta?.entityType, meta?.scope);
  const tag = meta?.consumerTag ? ` (${meta.consumerTag})` : "";
  console.debug(`[Dedup] MISS ${label}${tag}`);
}

export function recordDuplicateAttempt(
  queryKey: readonly unknown[],
  meta?: { entityType?: string; scope?: DedupScope; consumerTag?: string },
): void {
  if (!isQueryDedupAuditEnabled()) return;
  duplicateAttempts += 1;
  pushEvent({
    type: "duplicate_attempt",
    queryKey: JSON.stringify(queryKey),
    entityType: meta?.entityType,
    scope: meta?.scope,
    consumerTag: meta?.consumerTag,
    at: Date.now(),
  });
}

export function registerDedupConsumerTag(queryKey: readonly unknown[], consumerTag: string): void {
  if (!isQueryDedupAuditEnabled() || !consumerTag) return;
  const key = JSON.stringify(queryKey);
  let tags = consumerTagsByKey.get(key);
  if (!tags) {
    tags = new Set();
    consumerTagsByKey.set(key, tags);
  }
  if (tags.has(consumerTag)) return;
  if (tags.size > 0) {
    crossComponentReuse += 1;
    pushEvent({
      type: "cross_component",
      queryKey: key,
      consumerTag,
      otherTags: [...tags],
      at: Date.now(),
    });
  }
  tags.add(consumerTag);
}

export function getDedupAuditStats(): {
  dedupHits: number;
  dedupMisses: number;
  duplicateAttempts: number;
  crossComponentReuse: number;
} {
  return { dedupHits, dedupMisses, duplicateAttempts, crossComponentReuse };
}

export function getDedupAuditEvents(): readonly DedupAuditEvent[] {
  return events;
}

export function resetDedupAudit(): void {
  dedupHits = 0;
  dedupMisses = 0;
  duplicateAttempts = 0;
  crossComponentReuse = 0;
  events.length = 0;
  consumerTagsByKey.clear();
}
