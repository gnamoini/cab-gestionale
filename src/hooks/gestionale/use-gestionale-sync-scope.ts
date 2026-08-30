"use client";

import { useLayoutEffect, useMemo, useRef, useEffect } from "react";
import {
  registerGestionaleSyncScope,
  type GestionaleSyncScopeRegistration,
} from "@/lib/sync/gestionale-sync-scope";

function scopeSignature(reg: GestionaleSyncScopeRegistration): string {
  const visible = (reg.visibleEntities ?? [])
    .map((v) => `${v.table}:${v.entityId}`)
    .sort()
    .join(",");
  const tables = [...reg.tables].sort().join(",");
  return `${reg.scopeId}|${reg.domain}|${tables}|${visible}|${reg.route ?? ""}`;
}

/**
 * Registra lo scope sync della pagina/modal corrente.
 */
export function useGestionaleSyncScope(reg: GestionaleSyncScopeRegistration): void {
  const regRef = useRef(reg);
  const signature = useMemo(() => scopeSignature(reg), [reg]);

  useEffect(() => {
    regRef.current = reg;
  }, [reg]);

  useLayoutEffect(() => {
    return registerGestionaleSyncScope(regRef.current);
  }, [signature]);
}
