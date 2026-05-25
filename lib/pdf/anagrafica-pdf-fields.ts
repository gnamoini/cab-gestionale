import type { PdfField } from "@/lib/pdf/core/pdf-base-template";
import { pdfFieldFromValue } from "@/lib/pdf/gestionale-section-table";
import type { PreventivoRecord } from "@/lib/preventivi/types";
import type { SchedaIngressoFields } from "@/types/schede";

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
    field("Carburante", source.livelloCarburante),
  ].filter((f): f is PdfField => f !== null);
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

export function buildPreventivoClientePdfFields(p: PreventivoRecord): PdfField[] {
  return buildClienteAnagraficaPdfFields(p);
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
