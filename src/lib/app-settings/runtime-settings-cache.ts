"use client";

import type { SistemaPreventiviDefaults } from "@/lib/sistema/sistema-preventivi-defaults-storage";
import type { CabAppSettingsResolved } from "@/src/lib/app-settings/resolve-from-rows";

let resolved: CabAppSettingsResolved | null = null;

export function setRuntimeCabAppSettings(next: CabAppSettingsResolved | null): void {
  resolved = next;
}

export function getRuntimeCabAppSettings(): CabAppSettingsResolved | null {
  return resolved;
}

const DEFAULT_PREVENTIVI: SistemaPreventiviDefaults = { costoOrarioDefault: 48 };

export function getRuntimePreventiviDefaults(): SistemaPreventiviDefaults {
  if (resolved?.preventiviDefaults) return resolved.preventiviDefaults;
  return DEFAULT_PREVENTIVI;
}
