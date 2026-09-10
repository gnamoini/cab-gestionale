import { roundMoney } from "@/lib/vat/vat-rounding";
import type { VatConfiguration, VatLineCalculation } from "@/lib/vat/types";

export type VatLineInput = {
  configuration: VatConfiguration;
  quantita: number;
  prezzo_unitario: number;
  sconto_percent?: number;
  sign?: 1 | -1;
};

/** How to calculate — separate from configuration resolution. */
export function calculateVatLine(input: VatLineInput): VatLineCalculation {
  const qty = Math.max(0, Number(input.quantita) || 0);
  const price = Math.max(0, Number(input.prezzo_unitario) || 0);
  const discount = Math.min(100, Math.max(0, Number(input.sconto_percent ?? 0) || 0));
  const sign = input.sign === -1 ? -1 : 1;
  const rate = Math.max(0, Number(input.configuration.rate) || 0);
  const deductRate = Math.min(100, Math.max(0, Number(input.configuration.deductibility_rate) || 0));

  const taxable = roundMoney(qty * price * (1 - discount / 100)) * sign;

  let vatAmount = 0;
  if (input.configuration.operation_type_code === "IMPONIBILE" && rate > 0) {
    vatAmount = roundMoney(taxable * (rate / 100));
  }

  const deductible = roundMoney(vatAmount * (deductRate / 100));

  return {
    taxable_amount: taxable,
    vat_rate: rate,
    vat_nature: input.configuration.nature_code,
    vat_amount: vatAmount,
    gross_amount: roundMoney(taxable + vatAmount),
    deductible_vat_amount: deductible,
    non_deductible_vat_amount: roundMoney(vatAmount - deductible),
  };
}

export function calculateVatDocumentSummary(lines: readonly VatLineCalculation[]): {
  imponibile: number;
  iva: number;
  totale: number;
} {
  return lines.reduce(
    (acc, line) => ({
      imponibile: roundMoney(acc.imponibile + line.taxable_amount),
      iva: roundMoney(acc.iva + line.vat_amount),
      totale: roundMoney(acc.totale + line.gross_amount),
    }),
    { imponibile: 0, iva: 0, totale: 0 },
  );
}

export function vatCodeListItemToConfiguration(item: {
  vat_code_id: string;
  code: string;
  description: string;
  rate: number;
  nature_code: string | null;
  operation_type_code: string;
  direction: string;
}): VatConfiguration {
  return {
    configuration_id: item.vat_code_id,
    vat_code_id: item.vat_code_id,
    vat_code: item.code,
    description: item.description,
    rate: item.rate,
    nature_code: item.nature_code,
    operation_type_code: item.operation_type_code,
    direction: item.direction as VatConfiguration["direction"],
    deductibility_rate: 0,
    vat_account_id: null,
    vat_register_id: null,
    valid_from: "",
    valid_to: null,
    normative_reference: null,
  };
}
