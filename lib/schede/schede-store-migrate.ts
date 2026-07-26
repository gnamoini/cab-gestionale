import type {
  LavorazioneSchedeBundle,
  LavorazioneSchedeStore,
  RigaAddettoOreScheda,
  RigaLavorazioneScheda,
  SchedaLavorazioniDoc,
} from "@/types/schede";
import type { AddettoRecord } from "@/lib/lavorazioni/addetto-model";
import {
  backfillAddettoIdFromLegacyString,
  normalizeIngressoAddettoIds,
  normalizeRigaAddettoOreIds,
} from "@/lib/schede/schede-addetto-id-migrate";

function isRecord(x: unknown): x is Record<string, unknown> {
  return x !== null && typeof x === "object";
}

/** Migra righe legacy (singolo addetto + ore) al modello multi-addetto. */
export function normalizeRigaLavorazioneScheda(
  raw: unknown,
  addettiRecords?: readonly AddettoRecord[],
): RigaLavorazioneScheda {
  if (!isRecord(raw)) {
    return {
      id: `riga-${Date.now()}`,
      dataLavorazione: "",
      lavorazioniEffettuate: "",
      addettiAssegnati: [],
    };
  }
  const id = typeof raw.id === "string" && raw.id ? raw.id : `riga-${Date.now()}`;
  const dataLavorazione = typeof raw.dataLavorazione === "string" ? raw.dataLavorazione : "";
  const lavorazioniEffettuate =
    typeof raw.lavorazioniEffettuate === "string" ? raw.lavorazioniEffettuate : "";
  const addettiAssegnatiIn = raw.addettiAssegnati;
  if (Array.isArray(addettiAssegnatiIn)) {
    const addettiAssegnati: RigaAddettoOreScheda[] = addettiAssegnatiIn
      .filter(isRecord)
      .map((a) => {
        const normalized = normalizeRigaAddettoOreIds(a as Record<string, unknown>, addettiRecords);
        return {
          addetto: typeof normalized.addetto === "string" ? normalized.addetto : "",
          addettoId: typeof normalized.addettoId === "string" ? normalized.addettoId : null,
          oreImpiegate:
            typeof normalized.oreImpiegate === "number" && Number.isFinite(normalized.oreImpiegate)
              ? normalized.oreImpiegate
              : 0,
        };
      })
      .filter((a) => a.addetto.trim().length > 0 || a.addettoId || a.oreImpiegate > 0);
    return { id, dataLavorazione, lavorazioniEffettuate, addettiAssegnati };
  }
  const legacyAddetto = typeof raw.addetto === "string" ? raw.addetto : "";
  let ore = 0;
  if (typeof raw.oreImpiegate === "number" && Number.isFinite(raw.oreImpiegate)) ore = raw.oreImpiegate;
  const addettiAssegnati: RigaAddettoOreScheda[] = [];
  if (legacyAddetto.trim() || ore > 0) {
    addettiAssegnati.push({ addetto: legacyAddetto, oreImpiegate: ore });
  }
  return { id, dataLavorazione, lavorazioniEffettuate, addettiAssegnati };
}

function normalizeLavorazioniDoc(
  doc: unknown,
  addettiRecords?: readonly AddettoRecord[],
): SchedaLavorazioniDoc | null {
  if (!isRecord(doc) || doc.tipo !== "lavorazioni") return null;
  const campi = doc.campi;
  if (!isRecord(campi)) return doc as SchedaLavorazioniDoc;
  const righeRaw = campi.righe;
  const righe = Array.isArray(righeRaw) ? righeRaw.map((r) => normalizeRigaLavorazioneScheda(r, addettiRecords)) : [];
  return {
    ...(doc as SchedaLavorazioniDoc),
    campi: {
      identificazioneMacchina:
        typeof campi.identificazioneMacchina === "string" ? campi.identificazioneMacchina : "",
      righe,
    },
  };
}

export function normalizeSchedeBundle(
  bundle: LavorazioneSchedeBundle,
  addettiRecords?: readonly AddettoRecord[],
): LavorazioneSchedeBundle {
  const lav = bundle.lavorazioni ? normalizeLavorazioniDoc(bundle.lavorazioni, addettiRecords) : null;
  let ingresso = bundle.ingresso;
  if (ingresso?.campi) {
    const campi = normalizeIngressoAddettoIds(
      ingresso.campi as unknown as Record<string, unknown>,
      addettiRecords,
    ) as typeof ingresso.campi;
    ingresso = { ...ingresso, campi };
  }
  let ricambi = bundle.ricambi;
  if (ricambi?.campi?.righe) {
    const righe = ricambi.campi.righe.map((r) => {
      const raw = r as unknown as Record<string, unknown>;
      const addettoId =
        typeof raw.addettoId === "string"
          ? raw.addettoId
          : backfillAddettoIdFromLegacyString(addettiRecords, r.addetto, null);
      return { ...r, addettoId: addettoId ?? r.addettoId ?? null };
    });
    ricambi = { ...ricambi, campi: { ...ricambi.campi, righe } };
  }
  return {
    ...bundle,
    ingresso,
    lavorazioni: lav,
    ricambi,
  };
}

export function migrateSchedeStore(
  store: LavorazioneSchedeStore,
  addettiRecords?: readonly AddettoRecord[],
): LavorazioneSchedeStore {
  const out: LavorazioneSchedeStore = {};
  for (const [k, b] of Object.entries(store)) {
    if (!b || typeof b !== "object") continue;
    out[k] = normalizeSchedeBundle(b as LavorazioneSchedeBundle, addettiRecords);
  }
  return out;
}
