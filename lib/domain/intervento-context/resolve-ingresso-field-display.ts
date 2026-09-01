import type {
  InterventoContext,
  InterventoDisplayField,
} from "@/lib/domain/intervento-context/intervento-context.types";
import {
  schedaIngressoFieldReadState,
  schedaIngressoRecordExists,
} from "@/lib/domain/intervento-context/scheda-ingresso-read-policy";
import type { SchedaIngressoFields } from "@/types/schede";

export type IngressoDisplayFieldKey = keyof Pick<
  SchedaIngressoFields,
  | "cliente"
  | "cantiere"
  | "utilizzatore"
  | "tipoAttrezzatura"
  | "marcaAttrezzatura"
  | "modelloAttrezzatura"
  | "matricola"
  | "nScuderia"
  | "tipoTelaio"
  | "marcaTelaio"
  | "modelloTelaio"
  | "vin"
  | "targa"
>;

function trimCatalog(v: string | null | undefined): string {
  const t = (v ?? "").trim();
  if (!t || t === "—") return "";
  if (t.toLowerCase() === "non assegnata") return "";
  return t;
}

function catalogValue(ctx: InterventoContext, key: IngressoDisplayFieldKey): string {
  const cat = ctx.catalog;
  const mezzo = cat.mezzo;
  const att = cat.attrezzatura;

  switch (key) {
    case "cliente":
      return trimCatalog(mezzo.cliente);
    case "cantiere":
      return trimCatalog(mezzo.cantiere);
    case "utilizzatore":
      return trimCatalog(mezzo.utilizzatore);
    case "tipoAttrezzatura":
      return trimCatalog(att.tipoAttrezzatura) || trimCatalog(mezzo.tipoAttrezzatura);
    case "marcaAttrezzatura":
      return trimCatalog(att.marca) || trimCatalog(mezzo.marca);
    case "modelloAttrezzatura":
      return trimCatalog(att.modello) || trimCatalog(mezzo.modello);
    case "matricola":
      return trimCatalog(att.matricola) || trimCatalog(mezzo.matricola);
    case "nScuderia":
      return trimCatalog(mezzo.nScuderia);
    case "tipoTelaio":
      return trimCatalog(mezzo.tipoTelaio);
    case "marcaTelaio":
      return trimCatalog(mezzo.marcaTelaio);
    case "modelloTelaio":
      return trimCatalog(mezzo.modelloTelaio);
    case "vin":
      return trimCatalog(mezzo.vin);
    case "targa":
      return trimCatalog(mezzo.targa);
    default:
      return "";
  }
}

function lavorazioneLegacyValue(ctx: InterventoContext, key: IngressoDisplayFieldKey): string {
  const lav = ctx.lavorazione;
  switch (key) {
    case "cliente":
      return trimCatalog(lav.cliente);
    case "cantiere":
      return trimCatalog(lav.cantiere);
    case "utilizzatore":
      return trimCatalog(lav.utilizzatore);
    case "targa":
      return trimCatalog(lav.targa);
    case "matricola":
      return trimCatalog(lav.matricola);
    case "nScuderia":
      return trimCatalog(lav.nScuderia);
    default:
      return "";
  }
}

function bootstrapField(
  ctx: InterventoContext,
  key: IngressoDisplayFieldKey,
): InterventoDisplayField {
  const lavVal = lavorazioneLegacyValue(ctx, key);
  if (lavVal) return { value: lavVal, source: "lavorazione" };
  const catVal = catalogValue(ctx, key);
  if (catVal) return { value: catVal, source: "mezzo" };
  return { value: "", source: "mezzo" };
}

/**
 * SSOT read per campo permanente scheda ingresso.
 * A: scheda valorizzata | B: scheda presente+vuoto → "" | C: bootstrap catalogo.
 */
export function resolveIngressoFieldDisplay(
  ctx: InterventoContext,
  key: IngressoDisplayFieldKey,
): InterventoDisplayField {
  const state = schedaIngressoFieldReadState(ctx, key);

  if (state === "valorizzato") {
    const raw = ctx.schedaIngresso.campi![key];
    return { value: String(raw ?? "").trim(), source: "scheda" };
  }

  if (state === "vuoto") {
    return { value: "", source: "scheda" };
  }

  return bootstrapField(ctx, key);
}

export function resolveIngressoMarcaModelloDisplay(ctx: InterventoContext): InterventoDisplayField {
  const marca = resolveIngressoFieldDisplay(ctx, "marcaAttrezzatura");
  const modello = resolveIngressoFieldDisplay(ctx, "modelloAttrezzatura");
  const parts = [marca.value, modello.value].filter((s) => s.length > 0);
  const source =
    marca.source === "scheda" || modello.source === "scheda"
      ? "scheda"
      : marca.source === "lavorazione" || modello.source === "lavorazione"
        ? "lavorazione"
        : "mezzo";
  return { value: parts.join(" "), source };
}

export function ingressoDisplayFieldsFromContext(
  ctx: InterventoContext,
): Record<IngressoDisplayFieldKey, InterventoDisplayField> {
  const keys: IngressoDisplayFieldKey[] = [
    "cliente",
    "cantiere",
    "utilizzatore",
    "tipoAttrezzatura",
    "marcaAttrezzatura",
    "modelloAttrezzatura",
    "matricola",
    "nScuderia",
    "tipoTelaio",
    "marcaTelaio",
    "modelloTelaio",
    "vin",
    "targa",
  ];
  const out = {} as Record<IngressoDisplayFieldKey, InterventoDisplayField>;
  for (const key of keys) {
    out[key] = resolveIngressoFieldDisplay(ctx, key);
  }
  return out;
}

/** Raw scheda campi for editor (no catalog fallback). */
export function schedaIngressoCampiForEditor(ctx: InterventoContext): SchedaIngressoFields | null {
  return ctx.schedaIngresso.campi;
}

export function schedaIngressoHasRecord(ctx: InterventoContext): boolean {
  return schedaIngressoRecordExists(ctx);
}
