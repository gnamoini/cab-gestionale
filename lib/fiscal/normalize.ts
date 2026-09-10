/** SSOT fiscal normalization — aligned with SQL admin_normalize_* functions. */

export function normalizePartitaIva(value: string | null | undefined, country = "IT"): string | null {
  if (value == null || value.trim() === "") return null;
  const v = value.replace(/[^0-9A-Za-z]/g, "").toUpperCase();
  if (country.toUpperCase() === "IT") {
    const digits = v.replace(/^IT/, "");
    if (/^\d{11}$/.test(digits)) return digits;
  }
  return v || value.trim().toUpperCase();
}

export function normalizeCodiceFiscale(value: string | null | undefined, country = "IT"): string | null {
  if (value == null || value.trim() === "") return null;
  const v = value.replace(/[^0-9A-Za-z]/g, "").toUpperCase();
  if (country.toUpperCase() === "IT" && v.length === 16) return v;
  return v;
}

export function normalizeIban(value: string | null | undefined): string | null {
  if (value == null || value.trim() === "") return null;
  return value.replace(/\s+/g, "").toUpperCase();
}

export function normalizePec(value: string | null | undefined): string | null {
  if (value == null || value.trim() === "") return null;
  return value.trim().toLowerCase();
}

export function normalizeCodiceDestinatario(value: string | null | undefined): string | null {
  if (value == null || value.trim() === "") return null;
  const v = value.replace(/\s+/g, "").toUpperCase();
  if (v === "0000000" || (/^[A-Z0-9]{7}$/.test(v))) return v;
  return value.trim().toUpperCase();
}
