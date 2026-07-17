/** Tooltip solo se il testo aggiunge qualcosa rispetto a ciò che è già visibile. */
export function meaningfulTooltip(visible: string, hint?: string | null): string | undefined {
  const v = visible.trim();
  const h = hint?.trim();
  if (!h) return undefined;
  if (!v) return h;
  if (h.localeCompare(v, undefined, { sensitivity: "accent" }) === 0) return undefined;
  return h;
}

/** Pill/select: hint extra, oppure testo completo se troncato in cella. */
export function resolvePillTooltip(
  visible: string,
  hint?: string | null,
  truncated = false,
): string | undefined {
  const extra = meaningfulTooltip(visible, hint);
  if (extra) return extra;
  const v = visible.trim();
  if (truncated && v) return v;
  return undefined;
}
