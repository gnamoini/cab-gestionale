import type { AskReportToolResult } from "@/lib/report/ask-report/types";
import { ASK_REPORT_CONVERSATION_CACHE_TTL_MS } from "@/lib/report/ask-report/budget/ask-report-context-budget";

type CacheEntry = {
  expiresAt: number;
  toolResults: Map<string, AskReportToolResult>;
};

const cache = new Map<string, CacheEntry>();

function cacheKey(userId: string, conversationId: string): string {
  return `${userId}:${conversationId}`;
}

function toolResultKey(toolName: string, normalizedArgs: string): string {
  return `${toolName}:${normalizedArgs}`;
}

/** Cache key must include period — same metricId su mesi diversi non è lo stesso risultato. */
export function buildAskToolCacheKey(
  args: Record<string, unknown>,
  scope: { periodStart: string; periodEnd: string; compareMode: string },
): string {
  return JSON.stringify({
    args,
    period: { start: scope.periodStart, end: scope.periodEnd },
    compareMode: scope.compareMode,
  });
}

/** ponytail: in-process only — optimization, not correctness SSOT */
export function getCachedToolResult(
  userId: string,
  conversationId: string,
  toolName: string,
  normalizedArgs: string,
): AskReportToolResult | null {
  const entry = cache.get(cacheKey(userId, conversationId));
  if (!entry || entry.expiresAt < Date.now()) return null;
  return entry.toolResults.get(toolResultKey(toolName, normalizedArgs)) ?? null;
}

export function setCachedToolResult(
  userId: string,
  conversationId: string,
  toolName: string,
  normalizedArgs: string,
  result: AskReportToolResult,
): void {
  const key = cacheKey(userId, conversationId);
  let entry = cache.get(key);
  if (!entry || entry.expiresAt < Date.now()) {
    entry = { expiresAt: Date.now() + ASK_REPORT_CONVERSATION_CACHE_TTL_MS, toolResults: new Map() };
    cache.set(key, entry);
  }
  entry.toolResults.set(toolResultKey(toolName, normalizedArgs), result);
}

export function clearConversationCache(userId: string, conversationId: string): void {
  cache.delete(cacheKey(userId, conversationId));
}
