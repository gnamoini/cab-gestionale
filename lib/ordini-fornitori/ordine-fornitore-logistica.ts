import {
  ORDINE_FORNITORE_ASPETTO_ESTERIORE_VALUES,
  ORDINE_FORNITORE_CAUSALE_TRASPORTO_VALUES,
  ORDINE_FORNITORE_METODO_PAGAMENTO_VALUES,
  ORDINE_FORNITORE_PORTO_VALUES,
  ORDINE_FORNITORE_SPEDIZIONE_CURA_VALUES,
  ORDINE_FORNITORE_VETTORE_VALUES,
} from "@/lib/ordini-fornitori/ordine-fornitore-logistica-options";

export type OrdineFornitoreSpedizioneCura = "" | "mittente" | "destinatario" | "vettore";

/** @deprecated alias — stesso campo JSON `trasportoCura`. */
export type OrdineFornitoreTrasportoCura = OrdineFornitoreSpedizioneCura;

export type OrdineFornitoreLogistica = {
  aspettoEsteriore: string;
  trasportoCura: OrdineFornitoreSpedizioneCura;
  causaleTrasporto: string;
  porto: string;
  numeroColli: string;
  peso: string;
  metodoPagamento: string;
  vettore: string;
  riferimentoOrdine: string;
  dataConsegna: string;
};

function strField(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export function defaultOrdineFornitoreLogistica(): OrdineFornitoreLogistica {
  return {
    aspettoEsteriore: "cartoni",
    trasportoCura: "destinatario",
    causaleTrasporto: "vendita",
    porto: "porto_franco",
    numeroColli: "1",
    peso: "",
    metodoPagamento: "bonifico_anticipato",
    vettore: "bartolini",
    riferimentoOrdine: "",
    dataConsegna: "",
  };
}

/** Defaults di fabbrica per nuovo ordine (alias esplicito). */
export function emptyOrdineFornitoreLogistica(): OrdineFornitoreLogistica {
  return defaultOrdineFornitoreLogistica();
}

export function isDefaultOrdineFornitoreLogistica(logistica: OrdineFornitoreLogistica): boolean {
  const d = defaultOrdineFornitoreLogistica();
  return (
    logistica.aspettoEsteriore === d.aspettoEsteriore &&
    logistica.trasportoCura === d.trasportoCura &&
    logistica.causaleTrasporto === d.causaleTrasporto &&
    logistica.porto === d.porto &&
    logistica.numeroColli === d.numeroColli &&
    logistica.peso === d.peso &&
    logistica.metodoPagamento === d.metodoPagamento &&
    logistica.vettore === d.vettore &&
    logistica.riferimentoOrdine === d.riferimentoOrdine &&
    logistica.dataConsegna === d.dataConsegna
  );
}

function parseSpedizioneCura(value: unknown): OrdineFornitoreSpedizioneCura {
  const s = strField(value).trim();
  if (s === "mittente" || s === "destinatario" || s === "vettore") return s;
  return "";
}

export function parseOrdineFornitoreLogistica(
  raw: Record<string, unknown> | null | undefined,
): OrdineFornitoreLogistica {
  if (!raw || typeof raw !== "object") return emptyOrdineFornitoreLogistica();
  return {
    aspettoEsteriore: strField(raw.aspettoEsteriore ?? raw.aspetto_esteriore),
    trasportoCura: parseSpedizioneCura(raw.trasportoCura ?? raw.trasporto_cura ?? raw.spedizioneCura),
    causaleTrasporto: strField(
      raw.causaleTrasporto ?? raw.causale_trasporto ?? raw.causaleVendita ?? raw.causale_vendita,
    ),
    porto: strField(raw.porto),
    numeroColli: strField(raw.numeroColli ?? raw.numero_colli),
    peso: strField(raw.peso),
    metodoPagamento: strField(raw.metodoPagamento ?? raw.metodo_pagamento),
    vettore: strField(raw.vettore),
    riferimentoOrdine: strField(raw.riferimentoOrdine ?? raw.riferimento_ordine),
    dataConsegna: strField(raw.dataConsegna ?? raw.data_consegna),
  };
}

export function ordineFornitoreLogisticaToRecord(logistica: OrdineFornitoreLogistica): Record<string, unknown> {
  return {
    aspettoEsteriore: logistica.aspettoEsteriore.trim(),
    trasportoCura: logistica.trasportoCura,
    causaleTrasporto: logistica.causaleTrasporto.trim(),
    porto: logistica.porto.trim(),
    numeroColli: logistica.numeroColli.trim(),
    peso: logistica.peso.trim(),
    metodoPagamento: logistica.metodoPagamento.trim(),
    vettore: logistica.vettore.trim(),
    riferimentoOrdine: logistica.riferimentoOrdine.trim(),
    dataConsegna: logistica.dataConsegna.trim(),
  };
}

export function patchOrdineFornitoreLogisticaSnapshot(
  raw: Record<string, unknown> | null | undefined,
  patch: Partial<OrdineFornitoreLogistica>,
): Record<string, unknown> {
  const current = parseOrdineFornitoreLogistica(raw);
  return ordineFornitoreLogisticaToRecord({ ...current, ...patch });
}

export function ordineFornitoreLogisticaHasData(raw: Record<string, unknown> | null | undefined): boolean {
  const l = parseOrdineFornitoreLogistica(raw);
  return (
    Boolean(l.aspettoEsteriore.trim()) ||
    Boolean(l.trasportoCura) ||
    Boolean(l.causaleTrasporto.trim()) ||
    Boolean(l.porto.trim()) ||
    Boolean(l.numeroColli.trim()) ||
    Boolean(l.peso.trim()) ||
    Boolean(l.metodoPagamento.trim()) ||
    Boolean(l.vettore.trim()) ||
    Boolean(l.riferimentoOrdine.trim()) ||
    Boolean(l.dataConsegna.trim())
  );
}

function labelFromOptions(
  list: readonly { value: string; label: string }[],
  value: string,
): string {
  const v = value.trim();
  if (!v) return "";
  return list.find((item) => item.value === v)?.label ?? v;
}

function spedizioneCuraLabel(value: OrdineFornitoreSpedizioneCura): string {
  if (!value) return "";
  return labelFromOptions(ORDINE_FORNITORE_SPEDIZIONE_CURA_VALUES, value);
}

export function ordineFornitoreLogisticaPdfFields(
  raw: Record<string, unknown> | null | undefined,
): Array<{ label: string; value: string }> {
  const l = parseOrdineFornitoreLogistica(raw);
  const fields: Array<{ label: string; value: string }> = [];
  if (l.aspettoEsteriore.trim()) {
    fields.push({
      label: "Aspetto esteriore",
      value: labelFromOptions(ORDINE_FORNITORE_ASPETTO_ESTERIORE_VALUES, l.aspettoEsteriore),
    });
  }
  if (l.trasportoCura) {
    fields.push({ label: "Spedizione a cura di", value: spedizioneCuraLabel(l.trasportoCura) });
  }
  if (l.causaleTrasporto.trim()) {
    fields.push({
      label: "Causale trasporto",
      value: labelFromOptions(ORDINE_FORNITORE_CAUSALE_TRASPORTO_VALUES, l.causaleTrasporto),
    });
  }
  if (l.porto.trim()) {
    fields.push({
      label: "Porto",
      value: labelFromOptions(ORDINE_FORNITORE_PORTO_VALUES, l.porto),
    });
  }
  if (l.vettore.trim()) {
    fields.push({
      label: "Vettore",
      value: labelFromOptions(ORDINE_FORNITORE_VETTORE_VALUES, l.vettore),
    });
  }
  if (l.numeroColli.trim()) fields.push({ label: "N. colli", value: l.numeroColli.trim() });
  if (l.peso.trim()) fields.push({ label: "Peso", value: l.peso.trim() });
  if (l.metodoPagamento.trim()) {
    fields.push({
      label: "Metodo di pagamento",
      value: labelFromOptions(ORDINE_FORNITORE_METODO_PAGAMENTO_VALUES, l.metodoPagamento),
    });
  }
  if (l.riferimentoOrdine.trim()) fields.push({ label: "Riferimento ordine", value: l.riferimentoOrdine.trim() });
  if (l.dataConsegna.trim()) fields.push({ label: "Data consegna", value: l.dataConsegna.trim() });
  return fields;
}
