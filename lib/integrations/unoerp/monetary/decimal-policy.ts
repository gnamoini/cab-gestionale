/** Importi: solo centesimi interi. Mai float nel payload economico. */
export function toCents(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round(value * 100);
}

export function centsToDecimalString(cents: number): string {
  const n = Number.isFinite(cents) ? Math.trunc(cents) : 0;
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(n);
  const whole = Math.trunc(abs / 100);
  const frac = String(abs % 100).padStart(2, "0");
  return `${sign}${whole}.${frac}`;
}

export function moneyStringFromNumber(value: number): string {
  return centsToDecimalString(toCents(value));
}

export function totalsMatch(cabTotal: number, unoerpTotal: number): boolean {
  return toCents(cabTotal) === toCents(unoerpTotal);
}
