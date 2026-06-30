import { roundMoney } from "@/lib/fatturazione/invoice-calculations";
import type { OrdineFornitoreRiga, OrdineFornitoreRigaInput } from "@/lib/ordini-fornitori/types";

type RigaLike = Pick<OrdineFornitoreRiga, "quantita" | "prezzoUnitario" | "scontoPercent">;

function normalizeRigaInput(r: OrdineFornitoreRigaInput): RigaLike {
  return {
    quantita: Math.max(0, Number(r.quantita) || 0),
    prezzoUnitario: Math.max(0, Number(r.prezzo_unitario) || 0),
    scontoPercent: Math.min(100, Math.max(0, Number(r.sconto_percent ?? 0) || 0)),
  };
}

export function totaleNettoRigaOrdine(r: RigaLike): number {
  const gross = r.quantita * r.prezzoUnitario;
  const sp = Math.min(100, Math.max(0, r.scontoPercent ?? 0));
  return roundMoney(gross * (1 - sp / 100));
}

export function calcolaTotaliOrdineFornitore(input: {
  righe: readonly (RigaLike | OrdineFornitoreRigaInput)[];
  trasporto?: number;
  ivaPercent?: number;
}): {
  imponibileRighe: number;
  imponibile: number;
  iva: number;
  totale: number;
} {
  const righeNorm = input.righe.map((r) =>
    "prezzoUnitario" in r ? r : normalizeRigaInput(r),
  );
  const imponibileRighe = roundMoney(righeNorm.reduce((s, r) => s + totaleNettoRigaOrdine(r), 0));
  const trasporto = roundMoney(Math.max(0, Number(input.trasporto ?? 0) || 0));
  const ivaPercent = Math.min(100, Math.max(0, Number(input.ivaPercent ?? 22) || 0));
  const imponibile = roundMoney(imponibileRighe + trasporto);
  const iva = roundMoney(imponibile * (ivaPercent / 100));
  const totale = roundMoney(imponibile + iva);
  return { imponibileRighe, imponibile, iva, totale };
}
