import {
  normalizeCodiceDestinatario,
  normalizeCodiceFiscale,
  normalizeIban,
  normalizePartitaIva,
  normalizePec,
} from "./normalize";

const CF_CHECK_ODD = [1, 0, 5, 7, 9, 13, 15, 17, 19, 21, 2, 4, 18, 20, 11, 3, 6, 8, 12, 14, 16, 10, 22, 25, 24, 23];
const CF_CHECK_EVEN = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25];

function cfCheckChar(c: string): number {
  const code = c.charCodeAt(0);
  if (code >= 48 && code <= 57) return code - 48;
  return code - 65;
}

export function validatePartitaIvaIt(value: string | null | undefined): boolean {
  const n = normalizePartitaIva(value, "IT");
  if (!n || !/^\d{11}$/.test(n)) return false;
  let sum = 0;
  for (let i = 0; i < 11; i++) {
    const d = Number(n[i]);
    if (i % 2 === 0) sum += d;
    else {
      const dbl = d * 2;
      sum += dbl > 9 ? dbl - 9 : dbl;
    }
  }
  return sum % 10 === 0;
}

export function validateCodiceFiscaleIt(value: string | null | undefined): boolean {
  const cf = normalizeCodiceFiscale(value, "IT");
  if (!cf || cf.length !== 16) return false;
  let sum = 0;
  for (let i = 0; i < 15; i++) {
    const v = cfCheckChar(cf[i]);
    sum += i % 2 === 0 ? CF_CHECK_ODD[v] : CF_CHECK_EVEN[v];
  }
  const expected = String.fromCharCode(65 + (sum % 26));
  return cf[15] === expected;
}

export function validateIban(value: string | null | undefined): boolean {
  const iban = normalizeIban(value);
  if (!iban || iban.length < 15 || iban.length > 34) return false;
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]+$/.test(iban)) return false;
  const rearranged = iban.slice(4) + iban.slice(0, 4);
  let numeric = "";
  for (const ch of rearranged) {
    if (ch >= "A" && ch <= "Z") numeric += String(ch.charCodeAt(0) - 55);
    else numeric += ch;
  }
  let remainder = 0;
  for (const digit of numeric) {
    remainder = (remainder * 10 + Number(digit)) % 97;
  }
  return remainder === 1;
}

export function validatePec(value: string | null | undefined): boolean {
  const pec = normalizePec(value);
  if (!pec) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(pec);
}

export function validateCodiceDestinatario(value: string | null | undefined): boolean {
  const code = normalizeCodiceDestinatario(value);
  if (!code) return false;
  return code === "0000000" || /^[A-Z0-9]{7}$/.test(code);
}

export function validatePartitaIva(value: string | null | undefined, country = "IT"): boolean {
  if (!value?.trim()) return true;
  if (country.toUpperCase() === "IT") return validatePartitaIvaIt(value);
  return normalizePartitaIva(value, country) != null;
}

export function validateCodiceFiscale(value: string | null | undefined, country = "IT"): boolean {
  if (!value?.trim()) return true;
  if (country.toUpperCase() === "IT") return validateCodiceFiscaleIt(value);
  return normalizeCodiceFiscale(value, country) != null;
}
