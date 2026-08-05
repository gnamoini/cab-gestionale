import { normalizePreventivoTipoDocumento } from "@/lib/preventivi/preventivi-tipo-documento";
import type { PreventivoRecord, PreventivoStato } from "@/lib/preventivi/types";
import { resolveDocumentoTipoFile } from "@/lib/documenti/documento-tipo-file";
import { readDocumentIntelligenceMeta } from "@/lib/documents/document-meta";
import type { DocumentoGestionale } from "@/lib/types/gestionale";
import { logAutoreLabel } from "@/lib/gestionale-log/log-modifiche-view-model";
import { buildLogModificaSummary, isSystemLogAzione } from "@/lib/gestionale-log/log-summary";
import {
  formatTitleCasePhrase,
  imageLogModificaRiga,
  isImageLogAction,
  type MezziLogEntryLike,
} from "@/lib/gestionale-log/view-model";
import { diffMezzoChanges } from "@/lib/mezzi/mezzi-helpers";
import { parseMezzoMeta } from "@/lib/mezzi/mezzi-meta";
import type {
  DocumentoRow,
  LogModificaRow,
  LogModificaWithProfileRow,
  MezzoRow,
  PreventivoRow,
} from "@/src/types/supabase-tables";
import type { LavorazioneListRow } from "@/src/services/lavorazioni.service";
import type { MezzoGestito } from "@/lib/mezzi/types";
import {
  attrezzatureForMezzo,
  composeMezzoGestitoFromRows,
  mezzoGestitoFromRow,
} from "@/lib/domain/mezzo-attrezzatura/compose-mezzo-gestito";
import type { AttrezzaturaRow } from "@/src/types/supabase-tables";

function str(v: string | null | undefined, fallback = "—"): string {
  const t = v?.trim();
  return t && t.length > 0 ? t : fallback;
}

function matricolaUi(v: string | null | undefined): string {
  const t = v?.trim();
  return t && t.length > 0 ? t : "Non assegnata";
}

export { mezzoGestitoFromRow };

const CAT_MAP: Record<DocumentoRow["categoria"], DocumentoGestionale["categoria"]> = {
  listino: "listini",
  manuale: "manuali",
  catalogo: "cataloghi",
  certificazione: "certificazioni",
  altro: "altro",
};

export function documentoRowToGestionale(row: DocumentoRow): DocumentoGestionale {
  const meta = row.meta ?? {};
  const nome = typeof meta.nome === "string" && meta.nome.trim() ? meta.nome.trim() : row.url_file.split("/").pop() ?? "Documento";
  const marcaDb = row.marca?.trim() ?? "";
  const senzaMarca = !marcaDb || marcaDb === "—";
  const metaApp = meta.applicabilita;
  let applicabilita: DocumentoGestionale["applicabilita"] | undefined;
  if (!senzaMarca) {
    if (metaApp === "marca" || metaApp === "modello") {
      applicabilita = metaApp;
    } else if (metaApp === "macchina") {
      applicabilita = row.modello?.trim() ? "modello" : "marca";
    } else if (row.modello?.trim()) {
      applicabilita = "modello";
    } else {
      applicabilita = "marca";
    }
  }
  const intelligence = readDocumentIntelligenceMeta(meta as Record<string, unknown>);
  const tipoFile = resolveDocumentoTipoFile({
    urlFile: row.url_file,
    nome,
    meta,
    categoria: CAT_MAP[row.categoria] ?? "altro",
  });
  const previewCapable = tipoFile === "pdf" || tipoFile === "immagine";
  const contentVersion =
    (typeof meta.uploadedAt === "string" && meta.uploadedAt) || row.created_at || undefined;
  return {
    id: row.id,
    nome,
    categoria: CAT_MAP[row.categoria] ?? "altro",
    marca: senzaMarca ? "" : row.marca,
    macchina: row.modello ?? "—",
    tipoFile,
    fileEstensione:
      typeof meta.fileEstensione === "string" && meta.fileEstensione.trim()
        ? meta.fileEstensione.trim()
        : undefined,
    autoreCaricamento: typeof meta.autoreCaricamento === "string" ? meta.autoreCaricamento : "—",
    note: typeof meta.note === "string" ? meta.note : undefined,
    ultimaModifica: row.created_at,
    caricatoIl: row.created_at,
    dimensioneKb: typeof meta.dimensioneKb === "number" ? meta.dimensioneKb : 0,
    applicabilita,
    marcaKey:
      senzaMarca
        ? undefined
        : typeof meta.marcaKey === "string" && meta.marcaKey.trim() && meta.marcaKey.trim() !== "—"
          ? meta.marcaKey.trim()
          : row.marca,
    modelloKey:
      typeof meta.modelloKey === "string" && meta.modelloKey.trim()
        ? meta.modelloKey.trim()
        : row.modello?.trim() || undefined,
    urlDocumento: row.url_file,
    hasPreview: Boolean(intelligence.thumbnailKey) || previewCapable,
    contentVersion,
  };
}

function emptyManodopera(): PreventivoRecord["manodopera"] {
  return { oreTotali: 0, righeAddetti: [], costoOrario: 0, prezzoOrario: 0, scontoPercent: 0 };
}

/** Stub per lista hub / PDF minimi da riga Supabase (dettagli JSON opzionale). */
export function preventivoRowToRecordStub(row: PreventivoRow, mezzo: MezzoRow | null): PreventivoRecord {
  const det = (row.dettagli ?? {}) as Record<string, unknown>;
  const snapRaw = det.attrezzaturaSnapshot as Record<string, unknown> | undefined;
  const hasFrozenTarget = det.targetType === "telaio" || det.targetType === "attrezzatura";
  const snapMarca =
    typeof snapRaw?.marca === "string"
      ? snapRaw.marca
      : typeof det.attrezzaturaMarca === "string"
        ? det.attrezzaturaMarca
        : typeof det.marcaAttrezzatura === "string"
          ? det.marcaAttrezzatura
          : "";
  const snapModello =
    typeof snapRaw?.modello === "string"
      ? snapRaw.modello
      : typeof det.attrezzaturaModello === "string"
        ? det.attrezzaturaModello
        : typeof det.modelloAttrezzatura === "string"
          ? det.modelloAttrezzatura
          : "";
  const snapMatricola =
    typeof snapRaw?.matricola === "string"
      ? snapRaw.matricola
      : typeof det.attrezzaturaMatricola === "string"
        ? det.attrezzaturaMatricola
        : typeof det.matricola === "string"
          ? det.matricola
          : "";
  const numero = typeof det.numero === "string" && det.numero.trim() ? det.numero.trim() : `PV-${row.id.slice(0, 8)}`;
  const stato = (typeof det.stato === "string" ? det.stato : "bozza") as PreventivoStato;
  const righeRaw = det.righeRicambi;
  const righeRicambi: PreventivoRecord["righeRicambi"] = Array.isArray(righeRaw)
    ? (righeRaw as PreventivoRecord["righeRicambi"])
    : [];
  const manoRaw = det.manodopera as Partial<PreventivoRecord["manodopera"]> | undefined;
  const manodopera: PreventivoRecord["manodopera"] =
    manoRaw && typeof manoRaw.oreTotali === "number"
      ? {
          oreTotali: manoRaw.oreTotali,
          righeAddetti: Array.isArray(manoRaw.righeAddetti) ? manoRaw.righeAddetti : [],
          costoOrario: Number(manoRaw.costoOrario) || 0,
          prezzoOrario:
            Number(manoRaw.prezzoOrario) || Number(manoRaw.costoOrario) || 0,
          scontoPercent: Number(manoRaw.scontoPercent) || 0,
        }
      : emptyManodopera();

  const m = mezzo;
  const mezzoUi = m && !hasFrozenTarget ? mezzoGestitoFromRow(m) : null;
  return {
    id: row.id,
    numero,
    dataCreazione: row.created_at,
    aggiornatoAt: row.updated_at,
    stato,
    statoWorkflow: row.stato_workflow ?? (stato === "confermato" ? "acquisito" : (stato as PreventivoRecord["statoWorkflow"])),
    statoCliente: row.stato_cliente ?? null,
    versione: row.versione ?? 1,
    tipoDocumento: normalizePreventivoTipoDocumento(det.tipoDocumento),
    lavorazioneId: row.lavorazione_id ?? "",
    lavorazioneOrigine: (det.lavorazioneOrigine === "storico" ? "storico" : "attiva") as PreventivoRecord["lavorazioneOrigine"],
    cliente: row.cliente,
    cantiere: typeof det.cantiere === "string" ? det.cantiere : "",
    utilizzatore: typeof det.utilizzatore === "string" ? det.utilizzatore : str(m?.utilizzatore, ""),
    macchinaRiassunto:
      typeof det.macchinaRiassunto === "string"
        ? det.macchinaRiassunto
        : hasFrozenTarget
          ? `${snapMarca} ${snapModello}`.trim() || "—"
          : m
            ? `${m.marca} ${m.modello}`.trim()
            : "—",
    targa: m ? str(m.targa, "") : typeof det.targa === "string" ? det.targa : "",
    matricola: hasFrozenTarget ? snapMatricola : m?.matricola ?? (typeof det.matricola === "string" ? det.matricola : ""),
    nScuderia: m?.numero_scuderia ?? (typeof det.nScuderia === "string" ? det.nScuderia : "") ?? "",
    marcaAttrezzatura: hasFrozenTarget ? snapMarca : m?.marca ?? (typeof det.marcaAttrezzatura === "string" ? det.marcaAttrezzatura : ""),
    modelloAttrezzatura: hasFrozenTarget ? snapModello : m?.modello ?? (typeof det.modelloAttrezzatura === "string" ? det.modelloAttrezzatura : ""),
    tipoAttrezzatura:
      typeof det.tipoAttrezzatura === "string"
        ? det.tipoAttrezzatura
        : mezzoUi?.tipoAttrezzatura && mezzoUi.tipoAttrezzatura !== "—"
          ? mezzoUi.tipoAttrezzatura
          : "",
    oreLavoro:
      typeof det.oreLavoro === "string"
        ? det.oreLavoro
        : mezzoUi?.oreKm != null && mezzoUi.oreKm > 0
          ? String(mezzoUi.oreKm)
          : "",
    tipoTelaio: typeof det.tipoTelaio === "string" ? det.tipoTelaio : (mezzoUi?.tipoTelaio ?? ""),
    marcaTelaio: typeof det.marcaTelaio === "string" ? det.marcaTelaio : (mezzoUi?.marcaTelaio ?? ""),
    modelloTelaio: typeof det.modelloTelaio === "string" ? det.modelloTelaio : (mezzoUi?.modelloTelaio ?? ""),
    km:
      typeof det.km === "string"
        ? det.km
        : mezzoUi?.km != null
          ? String(mezzoUi.km)
          : mezzoUi?.oreKm != null && mezzoUi.oreKm > 0
            ? String(mezzoUi.oreKm)
            : "",
    targetType:
      det.targetType === "telaio" || det.targetType === "attrezzatura" ? det.targetType : undefined,
    attrezzaturaId: typeof det.attrezzaturaId === "string" ? det.attrezzaturaId : null,
    attrezzaturaMarca: typeof det.attrezzaturaMarca === "string" ? det.attrezzaturaMarca : snapMarca || undefined,
    attrezzaturaModello: typeof det.attrezzaturaModello === "string" ? det.attrezzaturaModello : snapModello || undefined,
    attrezzaturaMatricola: typeof det.attrezzaturaMatricola === "string" ? det.attrezzaturaMatricola : snapMatricola || undefined,
    attrezzaturaSnapshot:
      snapRaw && typeof snapRaw === "object" && typeof snapRaw.marca === "string"
        ? (snapRaw as PreventivoRecord["attrezzaturaSnapshot"])
        : undefined,
    livelloCarburante: typeof det.livelloCarburante === "string" ? det.livelloCarburante : "",
    richiedente: typeof det.richiedente === "string" ? det.richiedente : "",
    descrizioneLavorazioniCliente: typeof det.descrizioneLavorazioniCliente === "string" ? det.descrizioneLavorazioniCliente : "—",
    descrizioneLavorazioniTecnicaSorgente:
      typeof det.descrizioneLavorazioniTecnicaSorgente === "string" ? det.descrizioneLavorazioniTecnicaSorgente : "",
    descrizioneGenerataAuto: typeof det.descrizioneGenerataAuto === "string" ? det.descrizioneGenerataAuto : "",
    descriptionGenerationId:
      typeof det.descriptionGenerationId === "string" ? det.descriptionGenerationId : undefined,
    descriptionEngineMeta:
      det.descriptionEngineMeta && typeof det.descriptionEngineMeta === "object"
        ? (det.descriptionEngineMeta as PreventivoRecord["descriptionEngineMeta"])
        : undefined,
    righeRicambi,
    manodopera,
    noteFinali: typeof det.noteFinali === "string" ? det.noteFinali : "",
    totaleRicambi: typeof det.totaleRicambi === "number" ? det.totaleRicambi : 0,
    totaleManodopera: typeof det.totaleManodopera === "number" ? det.totaleManodopera : 0,
    totaleFinale: row.totale,
    createdBy: typeof det.createdBy === "string" ? det.createdBy : "—",
    lastEditedBy: typeof det.lastEditedBy === "string" ? det.lastEditedBy : "—",
  };
}

/** Costruisce oggetto minimale per `lavorazioneMatchesMezzo` da riga DB + mezzo join. */
export function lavRowToMatchShape(row: LavorazioneListRow) {
  const m = row.mezzo;
  const macchina = m ? `${m.marca} ${m.modello}`.trim() : "—";
  return {
    id: row.id,
    targa: m ? str(m.targa, "") : "—",
    matricola: m?.matricola ?? "—",
    macchina,
    nScuderia: m?.numero_scuderia ?? "",
  };
}

export type MezziHubLogEntry = MezziLogEntryLike & { id: string };

function trimOrEmpty(v: string | null | undefined): string {
  return v?.trim() ?? "";
}

/** Etichetta leggibile per log/UI (marca, modello, cliente, targa/matricola). */
export function mezzoLogOggettoLabelFromRow(r: MezzoRow): string {
  const marcaModello = `${trimOrEmpty(r.marca)} ${trimOrEmpty(r.modello)}`.trim();
  const cliente = trimOrEmpty(r.cliente);
  const targa = trimOrEmpty(r.targa);
  const matricola = trimOrEmpty(r.matricola);
  const ident =
    (targa && targa !== "—" ? targa : "") ||
    (matricola && matricola.toLowerCase() !== "non assegnata" ? matricola : "");

  const parts: string[] = [];
  if (marcaModello) parts.push(formatTitleCasePhrase(marcaModello));
  if (cliente) parts.push(formatTitleCasePhrase(cliente));
  if (ident) parts.push(ident.toUpperCase());

  if (parts.length) return parts.join(" · ");
  return r.id.length >= 8 ? r.id.slice(0, 8) : r.id;
}

export type MezziHubLogEntryOptions = {
  currentUserId?: string | null;
  currentDisplayName?: string;
};

export function logModificaRowToMezziHubLogEntry(
  row: LogModificaRow | LogModificaWithProfileRow,
  options?: MezziHubLogEntryOptions,
): MezziHubLogEntry {
  const p = row.payload as { snapshot?: unknown; before?: unknown; after?: unknown } | null | undefined;
  let mezzo = row.entita_id.length >= 8 ? row.entita_id.slice(0, 8) : row.entita_id;
  let changes: MezziLogEntryLike["changes"] = [];
  let tipo: MezziLogEntryLike["tipo"] = "update";
  let riepilogo = row.azione;
  let tipoRiga: string | undefined;
  let modifiche: string[] | undefined;
  let azione: string | undefined;

  if (isSystemLogAzione(row.azione)) {
    const summary = buildLogModificaSummary({
      entita: row.entita,
      entita_id: row.entita_id,
      azione: row.azione,
      payload: row.payload,
    });
    tipo = "update";
    mezzo = summary.oggettoRiga;
    riepilogo = summary.modifiche[0] ?? row.azione;
    tipoRiga = summary.tipoRiga;
    modifiche = summary.modifiche;
    azione = row.azione;
  } else if (isImageLogAction(row.azione)) {
    tipo = "update";
    changes = [{ campo: "Foto", prima: "—", dopo: imageLogModificaRiga(row.azione) }];
  } else if (row.azione === "CREATE") {
    tipo = "aggiunta";
    if (p?.snapshot && typeof p.snapshot === "object") {
      mezzo = mezzoLogOggettoLabelFromRow(p.snapshot as MezzoRow);
    }
  } else if (row.azione === "DELETE") {
    tipo = "rimozione";
    if (p?.snapshot && typeof p.snapshot === "object") {
      mezzo = mezzoLogOggettoLabelFromRow(p.snapshot as MezzoRow);
    }
  } else if (row.azione === "UPDATE") {
    tipo = "update";
    if (p?.before && p?.after && typeof p.before === "object" && typeof p.after === "object") {
      const beforeRow = p.before as MezzoRow;
      const afterRow = p.after as MezzoRow;
      mezzo = mezzoLogOggettoLabelFromRow(afterRow);
      changes = diffMezzoChanges(mezzoGestitoFromRow(beforeRow), mezzoGestitoFromRow(afterRow));
    }
  }

  return {
    id: row.id,
    tipo,
    mezzo,
    riepilogo,
    autore: logAutoreLabel(row, options?.currentUserId ?? null, options?.currentDisplayName ?? ""),
    at: row.created_at,
    changes,
    azione,
    tipoRiga,
    modifiche,
  };
}

export { attrezzatureForMezzo };
