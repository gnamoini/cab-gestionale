import type { PreventivoTipoDocumento } from "@/lib/preventivi/types";

export type { PreventivoTipoDocumento };

export const PREVENTIVO_TIPO_DOCUMENTO_DEFAULT: PreventivoTipoDocumento = "preventivo";

export const PREVENTIVO_TIPI_DOCUMENTO: readonly {
  id: PreventivoTipoDocumento;
  label: string;
}[] = [
  { id: "preventivo", label: "Preventivo" },
  { id: "consuntivo", label: "Consuntivo" },
] as const;

export function normalizePreventivoTipoDocumento(value: unknown): PreventivoTipoDocumento {
  return value === "consuntivo" ? "consuntivo" : "preventivo";
}

export function preventivoTipoDocumentoLabel(
  tipo: PreventivoTipoDocumento,
  style: "title" | "short" = "title",
): string {
  if (style === "short") return tipo === "consuntivo" ? "Cons." : "Prev.";
  return tipo === "consuntivo" ? "Consuntivo" : "Preventivo";
}

export function preventivoTipoDocumentoBadgeClass(tipo: PreventivoTipoDocumento): string {
  const base =
    "inline-flex shrink-0 items-center rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ring-1";
  if (tipo === "consuntivo") {
    return `${base} bg-sky-500/15 text-sky-800 ring-sky-500/35 dark:text-sky-200`;
  }
  return `${base} bg-zinc-500/10 text-zinc-700 ring-zinc-400/40 dark:text-zinc-300`;
}
