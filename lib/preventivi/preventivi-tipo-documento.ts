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
  style: "title" | "short" | "chip" = "title",
): string {
  if (style === "chip") return tipo === "consuntivo" ? "Cons" : "Prev";
  if (style === "short") return tipo === "consuntivo" ? "Cons." : "Prev.";
  return tipo === "consuntivo" ? "Consuntivo" : "Preventivo";
}

export type PreventivoTipoDocumentoBadgeVariant = "table" | "inline";

export function preventivoTipoDocumentoBadgeClass(
  tipo: PreventivoTipoDocumento,
  variant: PreventivoTipoDocumentoBadgeVariant = "inline",
): string {
  const table = variant === "table";
  const base = table
    ? "inline-flex h-[1.125rem] min-w-[2.35rem] shrink-0 items-center justify-center rounded px-1.5 text-[9px] font-bold uppercase tracking-[0.06em]"
    : "inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide";
  if (tipo === "consuntivo") {
    return `${base} bg-sky-500/12 text-sky-950 ring-1 ring-sky-500/30 dark:bg-sky-400/14 dark:text-sky-100 dark:ring-sky-400/35`;
  }
  return `${base} bg-orange-500/12 text-orange-950 ring-1 ring-orange-500/35 dark:bg-orange-400/14 dark:text-orange-100 dark:ring-orange-400/35`;
}
