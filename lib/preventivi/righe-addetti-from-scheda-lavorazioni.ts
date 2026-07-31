import type { AddettoRecord } from "@/lib/lavorazioni/addetto-model";
import { normalizePreventivoRigaAddettoWrite } from "@/lib/lavorazioni/addetto-write-freeze";
import type { PreventivoManodopera, PreventivoRigaAddetto } from "@/lib/preventivi/types";
import { backfillAddettoIdFromLegacyString } from "@/lib/schede/schede-addetto-id-migrate";
import { normalizeRigaLavorazioneScheda } from "@/lib/schede/schede-store-migrate";
import type { SchedaLavorazioniDoc } from "@/types/schede";

function toPreventivoRigaAddetto(raw: Record<string, unknown>): PreventivoRigaAddetto {
  return normalizePreventivoRigaAddettoWrite(raw) as PreventivoRigaAddetto;
}

/** Aggrega addetti/ore dalla scheda lavorazioni → righe manodopera preventivo (snapshot one-way). */
export function righeAddettiFromSchedaLavorazioni(
  lavScheda: SchedaLavorazioniDoc | null | undefined,
  addettiRecords: readonly AddettoRecord[],
): PreventivoManodopera["righeAddetti"] {
  const addMap = new Map<
    string,
    { addettoId: string | null; legacy?: string; ore: number }
  >();

  for (const raw of lavScheda?.campi.righe ?? []) {
    const rawNorm =
      typeof raw === "object" &&
      raw !== null &&
      Array.isArray((raw as { addettiAssegnati?: unknown }).addettiAssegnati) &&
      (raw as { addettiAssegnati: unknown[] }).addettiAssegnati.length === 0 &&
      (typeof (raw as { addetto?: string }).addetto === "string" ||
        typeof (raw as { oreImpiegate?: number }).oreImpiegate === "number")
        ? (() => {
            const { addettiAssegnati: _drop, ...rest } = raw as Record<string, unknown>;
            return rest;
          })()
        : raw;
    const row = normalizeRigaLavorazioneScheda(rawNorm, addettiRecords);
    for (const a of row.addettiAssegnati) {
      const resolvedId = backfillAddettoIdFromLegacyString(addettiRecords, a.addetto, a.addettoId);
      const legacy = a.addetto?.trim() || undefined;
      const ore = Number.isFinite(a.oreImpiegate) ? a.oreImpiegate : 0;
      if (!resolvedId && !legacy && ore <= 0) continue;

      const mapKey = resolvedId ?? legacy ?? "";
      if (!mapKey) continue;

      const prev = addMap.get(mapKey);
      addMap.set(mapKey, {
        addettoId: resolvedId,
        legacy: resolvedId ? undefined : legacy,
        ore: (prev?.ore ?? 0) + ore,
      });
    }
  }

  const righe: PreventivoRigaAddetto[] = [];
  for (const entry of addMap.values()) {
    const ore = Math.round(entry.ore * 100) / 100;
    if (entry.addettoId) {
      righe.push(toPreventivoRigaAddetto({ addettoId: entry.addettoId, ore }));
      continue;
    }
    righe.push(
      toPreventivoRigaAddetto({
        addettoId: null,
        ore,
        addettoLegacy: entry.legacy,
        legacyWarning: entry.legacy ? `Addetto storico non convertibile: ${entry.legacy}` : undefined,
      }),
    );
  }
  return righe;
}
