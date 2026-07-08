/** Formato SSOT: Rif. {numero} ({DD/MM/YYYY}) */
export function formatRiferimentoOrdineFromPreventivo(numero: string, dataIso: string): string {
  const n = numero.trim();
  const dateLabel = formatItalianDateFromIso(dataIso);
  if (n && dateLabel) return `Rif. ${n} (${dateLabel})`;
  if (n) return `Rif. ${n}`;
  if (dateLabel) return `Rif. (${dateLabel})`;
  return "";
}

export function formatItalianDateFromIso(iso: string): string {
  const trimmed = iso.trim();
  if (!trimmed) return "";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(trimmed);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  const d = new Date(trimmed);
  if (Number.isNaN(d.getTime())) return "";
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const yyyy = d.getUTCFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

export function normalizePreventivoNumeroForDedup(numero: string): string {
  return numero
    .trim()
    .toUpperCase()
    .replace(/^(N\.?|NR\.?|NUM\.?|PREV\.?|PREVENTIVO)\s*/i, "")
    .replace(/\s+/g, " ");
}
