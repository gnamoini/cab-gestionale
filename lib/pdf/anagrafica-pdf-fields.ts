import { formatLivelloCarburanteDisplay } from "@/lib/schede/livello-carburante-value";
import type { ClienteAnagrafica, ClienteContattoTipo, ClienteSedeFields } from "@/lib/clienti/clienti-anagrafica-types";
import type { PdfField } from "@/lib/pdf/core/pdf-base-template";
import { pdfFieldFromValue } from "@/lib/pdf/gestionale-section-table";
import type { PreventivoRecord } from "@/lib/preventivi/types";
import {
  resolveInterventoDisplayForSurface,
  schedaIngressoFieldsFromDisplay,
} from "@/lib/domain/intervento-context/resolve-intervento-display-for-surface";
import type { LavorazioneListRow } from "@/src/services/lavorazioni.service";
import type { LavorazioneSchedeStore, SchedaIngressoFields } from "@/types/schede";

export function buildClienteAnagraficaPdfFields(source: {
  cliente?: string;
  cantiere?: string;
  utilizzatore?: string;
  richiedente?: string;
}): PdfField[] {
  const field = pdfFieldFromValue;
  return [
    field("Cliente", source.cliente),
    field("Cantiere", source.cantiere),
    field("Utilizzatore", source.utilizzatore),
    field("Richiedente", source.richiedente),
  ].filter((f): f is PdfField => f !== null);
}

function formatSedeLine(sede: ClienteSedeFields): string {
  const via = [sede.via, sede.numeroCivico].filter(Boolean).join(" ").trim();
  const loc = [sede.cap, sede.citta, sede.provincia].filter(Boolean).join(" ").trim();
  return [via, loc].filter(Boolean).join(" — ");
}

function contattoByTipi(
  contatti: ClienteAnagrafica["contatti"],
  ...tipi: ClienteContattoTipo[]
): string | undefined {
  for (const tipo of tipi) {
    const hit = contatti.find((c) => c.tipo === tipo && c.valore.trim());
    if (hit) return hit.valore.trim();
  }
  return undefined;
}

export function buildClienteFiscalePdfFields(
  anag: ClienteAnagrafica,
  opts?: { codiceFiscale?: string },
): PdfField[] {
  const field = pdfFieldFromValue;
  const ragione = anag.ragioneSociale.trim() || anag.nomeDisplay.trim();
  const legale = formatSedeLine(anag.sedi.legale);
  const operativa = anag.sedeLegaleUgualeOperativa ? "" : formatSedeLine(anag.sedi.operativa);
  const pec = contattoByTipi(anag.contatti, "pec");
  const email = contattoByTipi(anag.contatti, "email");
  const telefono = contattoByTipi(anag.contatti, "telefono", "cellulare", "whatsapp");

  return [
    field("Ragione sociale", ragione),
    field("Sede legale", legale || undefined),
    operativa ? field("Sede operativa", operativa) : null,
    field("Partita IVA", anag.partitaIva.trim() || undefined),
    field("Codice fiscale", opts?.codiceFiscale?.trim() || undefined),
    field("Codice destinatario (SDI)", anag.codiceDestinatario.trim() || undefined),
    field("PEC", pec),
    field("Email", email),
    field("Telefono", telefono),
  ].filter((f): f is PdfField => f !== null);
}

function mergePdfFieldsDeduped(...groups: PdfField[][]): PdfField[] {
  const seen = new Set<string>();
  const out: PdfField[] = [];
  for (const group of groups) {
    for (const f of group) {
      const key = `${f.label}::${f.value}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(f);
    }
  }
  return out;
}

export type PreventivoClientePdfOptions = {
  clienteAnagrafica?: ClienteAnagrafica | null;
  codiceFiscale?: string;
};

export function buildAttrezzaturaAnagraficaPdfFields(source: {
  tipoAttrezzatura?: string;
  marcaAttrezzatura?: string;
  modelloAttrezzatura?: string;
  matricola?: string;
  nScuderia?: string;
  oreLavoro?: string;
}): PdfField[] {
  const field = pdfFieldFromValue;
  return [
    field("Tipo", source.tipoAttrezzatura),
    field("Marca", source.marcaAttrezzatura),
    field("Modello", source.modelloAttrezzatura),
    field("Matricola", source.matricola),
    field("N. scuderia", source.nScuderia),
    field("Ore lavoro", source.oreLavoro),
  ].filter((f): f is PdfField => f !== null);
}

export function buildTelaioAnagraficaPdfFields(source: {
  tipoTelaio?: string;
  marcaTelaio?: string;
  modelloTelaio?: string;
  targa?: string;
  km?: string;
  livelloCarburante?: string;
}): PdfField[] {
  const field = pdfFieldFromValue;
  return [
    field("Tipo", source.tipoTelaio),
    field("Marca", source.marcaTelaio),
    field("Modello", source.modelloTelaio),
    field("Targa", source.targa),
    field("KM", source.km),
    field("Carburante", formatLivelloCarburanteDisplay(source.livelloCarburante) || undefined),
  ].filter((f): f is PdfField => f !== null);
}

/** Sezioni PDF ingresso via read model quando disponibile row + store. */
export function buildIngressoAnagraficaPdfSectionsFromContext(
  row: LavorazioneListRow,
  schedeStore?: LavorazioneSchedeStore,
  fallbackIngresso?: SchedaIngressoFields,
): ReturnType<typeof buildIngressoAnagraficaPdfSections> {
  const display = resolveInterventoDisplayForSurface("pdf", {
    lavorazioneRow: row,
    schedeStore,
    ingressoCampi: fallbackIngresso ?? schedeStore?.[row.id]?.ingresso?.campi ?? null,
  });
  return buildIngressoAnagraficaPdfSections(
    schedaIngressoFieldsFromDisplay(display, fallbackIngresso),
  );
}

export function buildIngressoAnagraficaPdfSections(c: SchedaIngressoFields): {
  cliente: PdfField[];
  attrezzatura: PdfField[];
  telaio: PdfField[];
} {
  return {
    cliente: buildClienteAnagraficaPdfFields(c),
    attrezzatura: buildAttrezzaturaAnagraficaPdfFields(c),
    telaio: buildTelaioAnagraficaPdfFields(c),
  };
}

export function inferTipoAttrezzaturaPdfLegacy(p: PreventivoRecord): string | undefined {
  const mm = [p.marcaAttrezzatura, p.modelloAttrezzatura].filter(Boolean).join(" ").trim();
  const mac = p.macchinaRiassunto.trim();
  if (!mac) return undefined;
  if (mm && mac.toLowerCase() === mm.toLowerCase()) return undefined;
  if (mm && mac.toLowerCase().startsWith(mm.toLowerCase())) {
    const rest = mac.slice(mm.length).trim();
    return rest || undefined;
  }
  return mac;
}

export function buildPreventivoClientePdfFields(
  p: PreventivoRecord,
  opts?: PreventivoClientePdfOptions,
): PdfField[] {
  const operativi = buildClienteAnagraficaPdfFields(p);
  const anag = opts?.clienteAnagrafica;
  if (!anag?.id) return operativi;
  const fiscali = buildClienteFiscalePdfFields(anag, { codiceFiscale: opts?.codiceFiscale });
  return mergePdfFieldsDeduped(fiscali, operativi);
}

export function buildPreventivoAttrezzaturaPdfFields(p: PreventivoRecord): PdfField[] {
  const tipoEsplicito = p.tipoAttrezzatura?.trim();
  const tipoLegacy = !tipoEsplicito ? inferTipoAttrezzaturaPdfLegacy(p) : undefined;
  const fields = buildAttrezzaturaAnagraficaPdfFields({
    tipoAttrezzatura: tipoEsplicito || tipoLegacy,
    marcaAttrezzatura: p.marcaAttrezzatura,
    modelloAttrezzatura: p.modelloAttrezzatura,
    matricola: p.matricola,
    nScuderia: p.nScuderia,
    oreLavoro: p.oreLavoro,
  });
  if (fields.length > 0) return fields;
  const macchina = p.macchinaRiassunto.trim();
  if (macchina) return [{ label: "Macchina", value: macchina }];
  return fields;
}

export function buildPreventivoTelaioMezzoPdfFields(p: PreventivoRecord): PdfField[] {
  const fields = buildTelaioAnagraficaPdfFields(p);
  if (fields.length > 0) return fields;
  const targa = p.targa.trim();
  const macchina = p.macchinaRiassunto.trim();
  const legacy: PdfField[] = [];
  if (targa) legacy.push({ label: "Targa", value: targa });
  if (macchina) legacy.push({ label: "Macchina", value: macchina });
  return legacy;
}

/** @deprecated Usare buildPreventivoTelaioMezzoPdfFields */
export function buildPreventivoMezzoPdfFields(p: PreventivoRecord): PdfField[] {
  return buildPreventivoTelaioMezzoPdfFields(p);
}
