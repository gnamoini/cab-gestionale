import type { VatCodeListItem } from "@/lib/vat/types";

export async function fetchVatCodesForContext(input: {
  operation_date: string;
  direction?: "sales" | "purchase";
}): Promise<VatCodeListItem[]> {
  const params = new URLSearchParams({
    operation_date: input.operation_date,
    direction: input.direction ?? "sales",
  });
  const res = await fetch(`/api/vat/codes?${params.toString()}`);
  const body = (await res.json()) as { codes?: VatCodeListItem[]; error?: string };
  if (!res.ok) {
    throw new Error(body.error ?? "Errore caricamento codici IVA");
  }
  return body.codes ?? [];
}

export function pickDefaultVatCodeId(codes: readonly VatCodeListItem[]): string {
  const iva22 = codes.find((c) => c.code === "IVA22");
  if (iva22) return iva22.vat_code_id;
  return codes[0]?.vat_code_id ?? "";
}

export function formatVatCodeLabel(code: VatCodeListItem): string {
  const suffix = code.nature_code
    ? code.nature_code
    : `${code.rate}%`;
  return `${code.code} — ${code.description} (${suffix})`;
}
