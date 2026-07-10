import "server-only";

import { NextResponse } from "next/server";
import {
  formatImportCorrelationDisplay,
  resolveImportCorrelationId,
} from "@/lib/import-core/correlation-id";
import { getImportErrorDefinition } from "@/lib/import-core/import-error-catalog";

export function resolveRequestCorrelationId(request: Request): string {
  return resolveImportCorrelationId(request.headers.get("X-Correlation-Id"));
}

export function importCorrelationHeaders(correlationId: string): HeadersInit {
  return { "X-Correlation-Id": correlationId };
}

export function withImportCorrelation<T extends Record<string, unknown>>(
  correlationId: string,
  body: T,
): T & { correlationId: string; correlationDisplay: string } {
  return {
    ...body,
    correlationId,
    correlationDisplay: formatImportCorrelationDisplay(correlationId),
  };
}

export function importErrorJson(
  code: string,
  correlationId: string,
  status = 400,
  extra?: Record<string, unknown>,
) {
  const def = getImportErrorDefinition(code);
  return NextResponse.json(
    withImportCorrelation(correlationId, {
      error: def.userMessage,
      code: def.code,
      retryable: def.retryable,
      severity: def.severity,
      ...extra,
    }),
    { status, headers: importCorrelationHeaders(correlationId) },
  );
}
