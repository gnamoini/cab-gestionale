import type { CSSProperties } from "react";
import type { OrdineFornitoreLogistica } from "@/lib/ordini-fornitori/ordine-fornitore-logistica";
import {
  ORDINE_FORNITORE_ASPETTO_ESTERIORE_VALUES,
  ORDINE_FORNITORE_CAUSALE_TRASPORTO_VALUES,
  ORDINE_FORNITORE_METODO_PAGAMENTO_VALUES,
  ORDINE_FORNITORE_PORTO_VALUES,
  ORDINE_FORNITORE_SPEDIZIONE_CURA_VALUES,
  ORDINE_FORNITORE_VETTORE_VALUES,
} from "@/lib/ordini-fornitori/ordine-fornitore-logistica-options";

export type OrdineFornitoreLogisticaSelectItem = {
  value: string;
  label: string;
  pillStyle?: CSSProperties;
};

function toItem(value: string, label: string): OrdineFornitoreLogisticaSelectItem {
  return { value, label };
}

function withEmpty(items: OrdineFornitoreLogisticaSelectItem[]): OrdineFornitoreLogisticaSelectItem[] {
  return [toItem("", "—"), ...items];
}

export const ORDINE_FORNITORE_ASPETTO_ESTERIORE_ITEMS = withEmpty(
  ORDINE_FORNITORE_ASPETTO_ESTERIORE_VALUES.map((v) => toItem(v.value, v.label)),
);

export const ORDINE_FORNITORE_SPEDIZIONE_CURA_ITEMS = withEmpty(
  ORDINE_FORNITORE_SPEDIZIONE_CURA_VALUES.map((v) => toItem(v.value, v.label)),
);

/** @deprecated — usare ORDINE_FORNITORE_SPEDIZIONE_CURA_ITEMS */
export const ORDINE_FORNITORE_TRASPORTO_CURA_ITEMS = ORDINE_FORNITORE_SPEDIZIONE_CURA_ITEMS;

export const ORDINE_FORNITORE_CAUSALE_TRASPORTO_ITEMS = withEmpty(
  ORDINE_FORNITORE_CAUSALE_TRASPORTO_VALUES.map((v) => toItem(v.value, v.label)),
);

export const ORDINE_FORNITORE_PORTO_ITEMS = withEmpty(
  ORDINE_FORNITORE_PORTO_VALUES.map((v) => toItem(v.value, v.label)),
);

export const ORDINE_FORNITORE_VETTORE_ITEMS = withEmpty(
  ORDINE_FORNITORE_VETTORE_VALUES.map((v) => toItem(v.value, v.label)),
);

export const ORDINE_FORNITORE_METODO_PAGAMENTO_ITEMS = withEmpty(
  ORDINE_FORNITORE_METODO_PAGAMENTO_VALUES.map((v) => toItem(v.value, v.label)),
);

export const ORDINE_FORNITORE_LOGISTICA_PILL_SHELL =
  "rounded-[var(--ds-radius-lg)] border border-[color:color-mix(in_srgb,var(--cab-border-strong)_90%,var(--cab-border))] bg-[var(--cab-surface)] text-[color:var(--cab-text-muted)] shadow-[var(--cab-shadow-sm)] hover:border-[color:var(--cab-border-strong)] dark:border-white/10";

export function logisticaSelectBindingValue(
  knownValues: readonly { value: string }[],
  value: string,
): string {
  const v = value.trim();
  if (!v) return "";
  if (v === "altro") return "altro";
  if (!knownValues.some((item) => item.value === v)) return "altro";
  return v;
}

export function logisticaAltroCustomText(
  knownValues: readonly { value: string }[],
  value: string,
): string {
  const v = value.trim();
  if (!v || v === "altro") return "";
  if (!knownValues.some((item) => item.value === v)) return v;
  return "";
}

export function logisticaShowsAltroInput(
  knownValues: readonly { value: string }[],
  value: string,
): boolean {
  const v = value.trim();
  if (!v) return false;
  return v === "altro" || !knownValues.some((item) => item.value === v);
}

export function ordineFornitoreLogisticaSelectLabel(
  field: keyof Pick<
    OrdineFornitoreLogistica,
    "aspettoEsteriore" | "causaleTrasporto" | "porto" | "metodoPagamento" | "vettore"
  >,
  value: string,
): string {
  const v = value.trim();
  if (!v) return "—";
  const lists =
    field === "aspettoEsteriore"
      ? ORDINE_FORNITORE_ASPETTO_ESTERIORE_VALUES
      : field === "causaleTrasporto"
        ? ORDINE_FORNITORE_CAUSALE_TRASPORTO_VALUES
        : field === "porto"
          ? ORDINE_FORNITORE_PORTO_VALUES
          : field === "vettore"
            ? ORDINE_FORNITORE_VETTORE_VALUES
            : ORDINE_FORNITORE_METODO_PAGAMENTO_VALUES;
  return lists.find((item) => item.value === v)?.label ?? v;
}
