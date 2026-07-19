"use client";

import { useEffect, useRef } from "react";

function fingerprintDep(value: unknown): string {
  if (value === null || value === undefined) return String(value);
  const t = typeof value;
  if (t === "boolean" || t === "number" || t === "string") return String(value);
  if (Array.isArray(value)) {
    const len = value.length;
    if (len === 0) return "[]";
    const pick = (item: unknown) => {
      if (!item || typeof item !== "object") return "";
      const row = item as Record<string, unknown>;
      return String(row.id ?? row.updated_at ?? row.updatedAt ?? "");
    };
    return `[${len}:${pick(value[0])}:${pick(value[len - 1])}]`;
  }
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

/** Chiave stabile per dipendenze publish — evita loop su nuove reference array uguali. */
export function publishWhenReadyDepsKey(deps: readonly unknown[]): string {
  return deps.map(fingerprintDep).join("\0");
}

export function useSectionPublishRequest(): () => number {
  const ref = useRef(0);
  return () => {
    ref.current += 1;
    return ref.current;
  };
}

export function usePublishWhenReady(
  enabled: boolean,
  deps: unknown[],
  publish: (requestId: number) => void,
) {
  const requestRef = useRef(0);
  const publishRef = useRef(publish);
  const lastDepsKeyRef = useRef<string | null>(null);
  publishRef.current = publish;

  const depsKey = publishWhenReadyDepsKey(deps);

  useEffect(() => {
    if (!enabled) {
      lastDepsKeyRef.current = null;
      return;
    }
    if (depsKey === lastDepsKeyRef.current) return;
    lastDepsKeyRef.current = depsKey;
    requestRef.current += 1;
    publishRef.current(requestRef.current);
  }, [enabled, depsKey]);
}
