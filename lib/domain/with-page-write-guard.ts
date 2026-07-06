"use client";

import { ensurePageRead, ensurePageWrite } from "@/src/lib/auth/permission-guards";
import type { GestionalePageKey } from "@/src/lib/permissions/gestionale-pages";
import { err, type ServiceResult } from "@/src/services/service-result";

/** Wraps a service read fn with a single ensurePageRead at the entry boundary. */
export function withPageReadGuard<TArgs extends unknown[], TData>(
  pageKey: GestionalePageKey,
  fn: (...args: TArgs) => Promise<ServiceResult<TData>>,
): (...args: TArgs) => Promise<ServiceResult<TData>> {
  return async (...args: TArgs) => {
    const allowed = await ensurePageRead(pageKey);
    if (!allowed.success) return err(allowed.error ?? "Permesso richiesto.");
    return fn(...args);
  };
}

/** Wraps a service write fn with a single ensurePageWrite at the entry boundary. */
export function withPageWriteGuard<TArgs extends unknown[], TData>(
  pageKey: GestionalePageKey,
  fn: (...args: TArgs) => Promise<ServiceResult<TData>>,
): (...args: TArgs) => Promise<ServiceResult<TData>> {
  return async (...args: TArgs) => {
    const allowed = await ensurePageWrite(pageKey);
    if (!allowed.success) return err(allowed.error ?? "Permesso richiesto.");
    return fn(...args);
  };
}
