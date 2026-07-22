import { parseDecimalInput } from "@/lib/core/decimal-input";
import type { MezzoGestito } from "@/lib/mezzi/types";
import type { MezzoMeteringFieldKey } from "@/lib/schede/scheda-ingresso-field-roles";
import type { SchedaIngressoFields } from "@/types/schede";

export type MeteringEvalResult =
  | { action: "skip_empty" }
  | { action: "ok_update"; value: number }
  | { action: "warn_lower"; current: number; incoming: number };

export function parseSchedaMeteringValue(text: string | undefined | null): number | null {
  const n = parseDecimalInput(text?.trim() ?? "");
  if (n == null || n < 0) return null;
  return n;
}

export function evaluateMezzoMeteringUpdate(
  tipo: MezzoMeteringFieldKey,
  schedaValue: string,
  mezzo: MezzoGestito | null | undefined,
): MeteringEvalResult {
  const incoming = parseSchedaMeteringValue(schedaValue);
  if (incoming == null) return { action: "skip_empty" };

  const current =
    tipo === "km"
      ? (mezzo?.km ?? null)
      : mezzo?.oreKm != null && mezzo.oreKm > 0
        ? mezzo.oreKm
        : null;

  if (current == null || current <= 0) return { action: "ok_update", value: incoming };
  if (incoming >= current) return { action: "ok_update", value: incoming };
  return { action: "warn_lower", current, incoming };
}

export function buildMeteringPatchFromScheda(
  fields: SchedaIngressoFields,
  mezzo: MezzoGestito | null | undefined,
  meteringFields: MezzoMeteringFieldKey[],
  lavorazioneId?: string | null,
): {
  ultimo_km_rilevato?: number;
  ultimo_km_data?: string;
  ultimo_ore_rilevate?: number;
  ultimo_ore_data?: string;
  ultimo_aggiornamento_da_lavorazione_id?: string | null;
  km?: number;
} {
  if (
    lavorazioneId &&
    mezzo?.ultimoAggiornamentoDaLavorazioneId?.trim() === lavorazioneId.trim()
  ) {
    return {};
  }
  const now = new Date().toISOString();
  const patch: ReturnType<typeof buildMeteringPatchFromScheda> = {};

  if (meteringFields.includes("km")) {
    const ev = evaluateMezzoMeteringUpdate("km", fields.km, mezzo);
    if (ev.action === "ok_update") {
      patch.ultimo_km_rilevato = ev.value;
      patch.ultimo_km_data = now;
      patch.km = ev.value;
      if (lavorazioneId) patch.ultimo_aggiornamento_da_lavorazione_id = lavorazioneId;
    }
  }
  if (meteringFields.includes("oreLavoro")) {
    const ev = evaluateMezzoMeteringUpdate("oreLavoro", fields.oreLavoro, mezzo);
    if (ev.action === "ok_update") {
      patch.ultimo_ore_rilevate = ev.value;
      patch.ultimo_ore_data = now;
      if (lavorazioneId) patch.ultimo_aggiornamento_da_lavorazione_id = lavorazioneId;
    }
  }
  return patch;
}
