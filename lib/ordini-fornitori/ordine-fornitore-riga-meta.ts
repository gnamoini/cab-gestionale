import {
  parseRicambioUnitaMisura,
  RICAMBIO_UNITA_MISURA_DEFAULT,
  type RicambioUnitaMisura,
} from "@/lib/magazzino/ricambio-unita-misura";

export const ORDINE_RIGA_META_IVA = "ivaPercent";
export const ORDINE_RIGA_META_UM = "unitaMisura";

export function readRigaUnitaMisura(meta: Record<string, unknown> | null | undefined): RicambioUnitaMisura {
  return parseRicambioUnitaMisura(meta?.[ORDINE_RIGA_META_UM] ?? meta?.unita_misura);
}

export function readRigaIvaPercent(
  meta: Record<string, unknown> | null | undefined,
  fallback = 22,
): number {
  const raw = meta?.[ORDINE_RIGA_META_IVA] ?? meta?.iva_percent;
  const n = typeof raw === "number" ? raw : typeof raw === "string" ? Number(raw) : NaN;
  if (!Number.isFinite(n)) return fallback;
  return Math.min(100, Math.max(0, n));
}

export function patchRigaMeta(
  meta: Record<string, unknown> | null | undefined,
  patch: { unitaMisura?: RicambioUnitaMisura; ivaPercent?: number },
): Record<string, unknown> {
  const next = { ...(meta ?? {}) };
  if (patch.unitaMisura !== undefined) next[ORDINE_RIGA_META_UM] = patch.unitaMisura;
  if (patch.ivaPercent !== undefined) next[ORDINE_RIGA_META_IVA] = patch.ivaPercent;
  return next;
}

export function defaultOrdineRigaMeta(fallbackIva = 22): Record<string, unknown> {
  return {
    [ORDINE_RIGA_META_UM]: RICAMBIO_UNITA_MISURA_DEFAULT,
    [ORDINE_RIGA_META_IVA]: fallbackIva,
  };
}
