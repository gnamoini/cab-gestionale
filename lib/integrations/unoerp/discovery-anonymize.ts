const SENSITIVE_KEY =
  /^(auth|password|token|cookie|authorization|pec|email|telefono|tel|cellulare|iban|note|indirizzo|via|cognome|nome|ragsoc|ragione|denominazione|partita|cf|codice_fiscale|piva|partita_iva)$/i;

const PII_VALUE =
  /@[a-z0-9.-]+\.[a-z]{2,}|^\d{11}$|^[A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z]$/i;

export function anonymizeValue(key: string, value: unknown, counter: { n: number }): unknown {
  if (value == null) return value;
  if (typeof value === "string") {
    if (SENSITIVE_KEY.test(key) || PII_VALUE.test(value.trim())) {
      counter.n += 1;
      return `REDACTED_${counter.n}`;
    }
    if (value.length > 80) return `${value.slice(0, 20)}…[truncated]`;
    return value;
  }
  if (Array.isArray(value)) return value.map((v, i) => anonymizeValue(`${key}[${i}]`, v, counter));
  if (typeof value === "object") return anonymizeRecord(value as Record<string, unknown>, counter);
  return value;
}

export function anonymizeRecord(record: Record<string, unknown>, counter = { n: 0 }): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(record)) {
    out[k] = anonymizeValue(k, v, counter);
  }
  return out;
}

export function summarizeFieldset(fieldset: Record<string, { label?: string | null; format?: string; insert_ignore?: boolean }> | undefined) {
  if (!fieldset) return [];
  return Object.entries(fieldset).map(([name, meta]) => ({
    field: name,
    label: meta.label ?? null,
    format: meta.format ?? null,
    insert_ignore: meta.insert_ignore ?? null,
    has_valori: meta && "valori" in meta ? true : false,
  }));
}

export function firstIndexRow(indexResponse: unknown, pk: string): string | null {
  if (!indexResponse || typeof indexResponse !== "object") return null;
  const data = (indexResponse as { data?: unknown }).data;
  if (!data || typeof data !== "object") return null;
  const tabs = Object.values(data as Record<string, unknown>);
  for (const tab of tabs) {
    if (!tab || typeof tab !== "object") continue;
    const rows = Object.values(tab as Record<string, unknown>);
    for (const row of rows) {
      if (row && typeof row === "object" && pk in (row as Record<string, unknown>)) {
        const id = (row as Record<string, unknown>)[pk];
        if (id != null && String(id).length > 0) return String(id);
      }
    }
  }
  return null;
}
