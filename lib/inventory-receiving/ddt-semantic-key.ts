export function buildDdtSemanticKey(input: {
  supplierLabel?: string;
  documentNumber?: string;
  documentDate?: string;
}): string | null {
  const supplier = (input.supplierLabel ?? "").trim().toLowerCase();
  const number = (input.documentNumber ?? "").trim().toLowerCase();
  const date = (input.documentDate ?? "").trim().slice(0, 10);
  if (!supplier || !number || !date) return null;
  return `${supplier}|${number}|${date}`;
}
