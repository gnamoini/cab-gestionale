/** SSOT monetary rounding for VAT engine (2 decimal places). */
export function roundMoney(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round(value * 100) / 100;
}

export const VAT_AMOUNT_TOLERANCE = 0.01;

export function vatAmountsConsistent(taxable: number, rate: number, vatAmount: number): boolean {
  if (rate <= 0) return vatAmount === 0;
  return Math.abs(roundMoney(taxable * (rate / 100)) - vatAmount) <= VAT_AMOUNT_TOLERANCE;
}
