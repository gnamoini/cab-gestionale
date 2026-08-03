import { lavorazioneDisplayCodice } from "@/lib/lavorazioni/lavorazione-codice";
import { isPreventivoUuid } from "@/lib/preventivi/preventivi-db-mapper";
import { nextPreventivoNumeroManualeFromRecords } from "@/lib/preventivi/preventivo-numero-manuale";
import {
  isPreventivoNumeroLavorazione,
  nextPreventivoNumeroForLavorazione,
} from "@/lib/preventivi/preventivo-numero-lavorazione";
import {
  nextPreventivoId as nextPreventivoIdFromCache,
  nextPreventivoNumeroFromRecords,
} from "@/lib/preventivi/preventivi-records-from-cache";
import { bumpReportDataRefresh } from "@/lib/report/report-broadcast";
import { PREVENTIVI_MAX, PREVENTIVI_STORAGE_KEY } from "@/lib/preventivi/constants";
import { ensurePreventivoStruttura } from "@/lib/preventivi/preventivi-struttura";
import { parseRicambioUnitaMisura } from "@/lib/magazzino/ricambio-unita-misura";
import { normalizePreventivoTipoDocumento } from "@/lib/preventivi/preventivi-tipo-documento";
import { calcolaTotaliPreventivo } from "@/lib/preventivi/preventivi-totals";
import { normalizePreventivoRigaAddettoWrite } from "@/lib/lavorazioni/addetto-write-freeze";
import type {
  PreventivoManodopera,
  PreventivoRecord,
  PreventivoRigaAddetto,
  PreventivoRigaRicambio,
  PreventivoRigaRicambioTipo,
  PreventivoStato,
} from "@/lib/preventivi/types";

function warnDeprecatedWrite(name: string): void {
  if (process.env.NODE_ENV === "development") {
    console.warn(`[preventivi-storage] ${name} is deprecated — use DB + React Query`);
  }
}

function hydratePreventivo(raw: unknown): PreventivoRecord | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const id = o.id;
  if (typeof id !== "string" || !id) return null;

  const righeIn = Array.isArray(o.righeRicambi) ? o.righeRicambi : [];
  const righeRicambi: PreventivoRigaRicambio[] = righeIn.map((rr: unknown) => {
    const r = rr as Record<string, unknown>;
    return {
      id: typeof r.id === "string" && r.id ? r.id : `prr-${Math.random().toString(36).slice(2, 9)}`,
      ricambioId: typeof r.ricambioId === "string" ? r.ricambioId : null,
      codiceOE: String(r.codiceOE ?? ""),
      descrizione: String(r.descrizione ?? ""),
      quantita: Math.max(0.01, Number(r.quantita) || 0),
      prezzoUnitario: Math.max(0, Number(r.prezzoUnitario) || 0),
      costoUnitario:
        Number.isFinite(Number(r.costoUnitario)) && Number(r.costoUnitario) > 0
          ? Math.round(Number(r.costoUnitario) * 100) / 100
          : undefined,
      scontoPercent: Math.min(100, Math.max(0, Number(r.scontoPercent) || 0)),
      unitaMisura: parseRicambioUnitaMisura(r.unitaMisura),
      tipo:
        r.tipo === "materiali_consumo" || r.tipo === "standard"
          ? (r.tipo as PreventivoRigaRicambioTipo)
          : undefined,
    };
  });

  const m = (o.manodopera as Record<string, unknown>) || {};
  const addettiArr = Array.isArray(m.righeAddetti) ? m.righeAddetti : [];
  const righeAddetti: PreventivoRigaAddetto[] = addettiArr
    .map((a: unknown) => {
      const x = a as Record<string, unknown>;
      const legacy = String(x.addetto ?? x.addettoLegacy ?? "").trim();
      const existingId = typeof x.addettoId === "string" ? x.addettoId.trim() : "";
      if (existingId) {
        return normalizePreventivoRigaAddettoWrite({
          addettoId: existingId,
          ore: Number(x.ore) || 0,
        }) as PreventivoRigaAddetto;
      }
      if (legacy === "Officina") {
        return normalizePreventivoRigaAddettoWrite({
          addettoId: null,
          ore: Number(x.ore) || 0,
          addettoLegacy: "Officina",
          legacyWarning: "Addetto storico non convertibile: Officina",
        }) as PreventivoRigaAddetto;
      }
      return normalizePreventivoRigaAddettoWrite({
        addettoId: null,
        ore: Number(x.ore) || 0,
        addettoLegacy: legacy || undefined,
        legacyWarning: legacy ? `Addetto storico non convertibile: ${legacy}` : undefined,
      }) as PreventivoRigaAddetto;
    })
    .filter((x) => x.addettoId || x.addettoLegacy || x.ore > 0);

  const legacyRate = Math.max(0, Number(m.costoOrario) || 0);
  const prezzoOrario = Math.max(0, Number(m.prezzoOrario) || 0) || legacyRate;
  const manodopera: PreventivoManodopera = {
    oreTotali: Math.max(0, Number(m.oreTotali) || 0),
    righeAddetti: righeAddetti.length
      ? righeAddetti
      : [
          normalizePreventivoRigaAddettoWrite({
            addettoId: null,
            ore: 1,
            addettoLegacy: "Officina",
            legacyWarning: "Addetto storico non convertibile: Officina",
          }) as PreventivoRigaAddetto,
        ],
    costoOrario: legacyRate,
    prezzoOrario,
    scontoPercent: Math.min(100, Math.max(0, Number(m.scontoPercent) || 0)),
  };
  if (manodopera.oreTotali <= 0) {
    manodopera.oreTotali = Math.max(
      0.25,
      Math.round(manodopera.righeAddetti.reduce((s, x) => s + x.ore, 0) * 100) / 100,
    );
  }

  const statoRaw = String(o.stato ?? "bozza");
  const statiValidi: PreventivoStato[] = ["bozza", "inviato", "confermato", "annullato"];
  const stato = (statiValidi.includes(statoRaw as PreventivoStato) ? statoRaw : "bozza") as PreventivoStato;

  const base: PreventivoRecord = {
    id,
    numero: String(o.numero ?? ""),
    dataCreazione: String(o.dataCreazione ?? new Date().toISOString()),
    aggiornatoAt: String(o.aggiornatoAt ?? new Date().toISOString()),
    stato,
    tipoDocumento: normalizePreventivoTipoDocumento(o.tipoDocumento),
    lavorazioneId: String(o.lavorazioneId ?? ""),
    lavorazioneOrigine: o.lavorazioneOrigine === "storico" ? "storico" : "attiva",
    lavorazioneTimestamp: typeof o.lavorazioneTimestamp === "string" ? o.lavorazioneTimestamp : undefined,
    cliente: String(o.cliente ?? ""),
    cantiere: String(o.cantiere ?? ""),
    utilizzatore: String(o.utilizzatore ?? ""),
    macchinaRiassunto: String(o.macchinaRiassunto ?? ""),
    targa: String(o.targa ?? ""),
    matricola: String(o.matricola ?? ""),
    nScuderia: String(o.nScuderia ?? ""),
    marcaAttrezzatura: String(o.marcaAttrezzatura ?? ""),
    modelloAttrezzatura: String(o.modelloAttrezzatura ?? ""),
    tipoAttrezzatura: String(o.tipoAttrezzatura ?? ""),
    oreLavoro: String(o.oreLavoro ?? ""),
    tipoTelaio: String(o.tipoTelaio ?? ""),
    marcaTelaio: String(o.marcaTelaio ?? ""),
    modelloTelaio: String(o.modelloTelaio ?? ""),
    km: String(o.km ?? ""),
    livelloCarburante: String(o.livelloCarburante ?? ""),
    richiedente: String(o.richiedente ?? ""),
    descrizioneLavorazioniCliente: String(o.descrizioneLavorazioniCliente ?? ""),
    descrizioneLavorazioniTecnicaSorgente: String(o.descrizioneLavorazioniTecnicaSorgente ?? ""),
    descrizioneGenerataAuto: String(o.descrizioneGenerataAuto ?? ""),
    righeRicambi,
    manodopera,
    sanificazionePrezzo: Math.max(0, Number(o.sanificazionePrezzo) || 0),
    sanificazioneOre: o.sanificazioneOre == null ? 1 : Math.max(0, Number(o.sanificazioneOre) || 0),
    sanificazioneDescrizione:
      typeof o.sanificazioneDescrizione === "string" ? o.sanificazioneDescrizione : undefined,
    collaudoPrezzo: Math.max(0, Number(o.collaudoPrezzo) || 0),
    collaudoOre: o.collaudoOre == null ? 1 : Math.max(0, Number(o.collaudoOre) || 0),
    collaudoDescrizione:
      typeof o.collaudoDescrizione === "string" ? o.collaudoDescrizione : undefined,
    noteFinali: String(o.noteFinali ?? ""),
    totaleRicambi: 0,
    totaleManodopera: 0,
    totaleSmaltimento: 0,
    totaleFinale: 0,
    createdBy: String(o.createdBy ?? ""),
    lastEditedBy: String(o.lastEditedBy ?? ""),
  };
  const strutturato = ensurePreventivoStruttura(base);
  return { ...strutturato, ...calcolaTotaliPreventivo(strutturato) };
}

/** @deprecated Use nextPreventivoNumeroFromRecords from preventivi-records-from-cache */
export function nextPreventivoNumero(existing: PreventivoRecord[]): string {
  return nextPreventivoNumeroFromRecords(existing);
}

export function nextPreventivoId(): string {
  return nextPreventivoIdFromCache();
}

/** Read-only: usato solo per migrazione one-shot localStorage → DB. */
export function loadPreventivi(): PreventivoRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(PREVENTIVI_STORAGE_KEY);
    if (!raw) return [];
    const p = JSON.parse(raw) as unknown;
    if (!Array.isArray(p)) return [];
    return p
      .filter((x) => x && typeof x === "object")
      .slice(0, PREVENTIVI_MAX)
      .map((x) => hydratePreventivo(x))
      .filter((x): x is PreventivoRecord => x !== null);
  } catch {
    return [];
  }
}

/** Rimuove dati entity preventivi da localStorage (post-migrazione admin). */
export function clearPreventiviLocalEntityData(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(PREVENTIVI_STORAGE_KEY);
    bumpReportDataRefresh();
  } catch {
    /* quota */
  }
}

/** @deprecated DB-first: no-op — localStorage non usato in produzione. */
export function savePreventivi(_rows: PreventivoRecord[]): void {
  warnDeprecatedWrite("savePreventivi");
}

/** @deprecated DB-first: no-op — localStorage non usato in produzione. */
export function appendPreventivo(_row: PreventivoRecord): void {
  warnDeprecatedWrite("appendPreventivo");
}

/** @deprecated DB-first: no-op — localStorage non usato in produzione. */
export function upsertPreventivo(_row: PreventivoRecord): void {
  warnDeprecatedWrite("upsertPreventivo");
}

/** @deprecated DB-first: no-op — localStorage non usato in produzione. */
export function deletePreventivo(_id: string): void {
  warnDeprecatedWrite("deletePreventivo");
}

export function duplicatePreventivo(
  source: PreventivoRecord,
  autore: string,
  existingRecords: readonly PreventivoRecord[],
): PreventivoRecord {
  const now = new Date().toISOString();
  let numero: string;
  if (isPreventivoUuid(source.lavorazioneId)) {
    const codiceFromNumero = isPreventivoNumeroLavorazione(source.numero)
      ? source.numero.trim().replace(/\/\d+$/, "")
      : lavorazioneDisplayCodice({ id: source.lavorazioneId });
    numero = nextPreventivoNumeroForLavorazione(
      codiceFromNumero,
      existingRecords,
      source.lavorazioneId,
    );
  } else {
    numero = nextPreventivoNumeroManualeFromRecords(existingRecords);
  }
  const righeRicambi = source.righeRicambi.map((r) => ({
    ...r,
    scontoPercent: r.scontoPercent ?? 0,
  }));
  const manodopera: PreventivoManodopera = {
    ...source.manodopera,
    scontoPercent: source.manodopera.scontoPercent ?? 0,
  };
  const next: PreventivoRecord = {
    ...source,
    id: nextPreventivoId(),
    numero,
    dataCreazione: now,
    aggiornatoAt: now,
    stato: "bozza",
    righeRicambi,
    manodopera,
    createdBy: autore,
    lastEditedBy: autore,
  };
  return { ...next, ...calcolaTotaliPreventivo(next) };
}

export function countPreventiviByLavorazioneId(): Map<string, number> {
  const m = new Map<string, number>();
  for (const p of loadPreventivi()) {
    m.set(p.lavorazioneId, (m.get(p.lavorazioneId) ?? 0) + 1);
  }
  return m;
}
