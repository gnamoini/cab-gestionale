import { roundMoney } from "@/lib/fatturazione/invoice-calculations";
import type { OrdineFornitoreRiga, OrdineFornitoreRigaInput } from "@/lib/ordini-fornitori/types";
import { isOrdineSpesaVariaRiga } from "@/lib/ordini-fornitori/ordine-fornitore-spesa-varia";
import { readRigaIvaPercent } from "@/lib/ordini-fornitori/ordine-fornitore-riga-meta";

type RigaLike = Pick<OrdineFornitoreRiga, "quantita" | "prezzoUnitario" | "scontoPercent" | "ivaPercent" | "meta">;

function normalizeRigaInput(r: OrdineFornitoreRigaInput, fallbackIva: number): RigaLike {
  const meta = (r.meta ?? {}) as Record<string, unknown>;
  return {
    quantita: Math.max(0, Number(r.quantita) || 0),
    prezzoUnitario: Math.max(0, Number(r.prezzo_unitario) || 0),
    scontoPercent: Math.min(100, Math.max(0, Number(r.sconto_percent ?? 0) || 0)),
    ivaPercent: readRigaIvaPercent(meta, fallbackIva),
    meta,
  };
}

function ivaPercentForRiga(r: RigaLike, fallbackIva: number): number {
  if (typeof r.ivaPercent === "number" && Number.isFinite(r.ivaPercent)) {
    return Math.min(100, Math.max(0, r.ivaPercent));
  }
  return readRigaIvaPercent(r.meta, fallbackIva);
}

export function totaleNettoRigaOrdine(r: Pick<RigaLike, "quantita" | "prezzoUnitario" | "scontoPercent">): number {
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
  imponibileSpeseVarie: number;
  imponibile: number;
  iva: number;
  totale: number;
} {
  const trasportoIvaPercent = Math.min(100, Math.max(0, Number(input.ivaPercent ?? 22) || 0));
  const righeNorm = input.righe.map((r) =>
    "prezzoUnitario" in r ? r : normalizeRigaInput(r, trasportoIvaPercent),
  );

  let imponibileOggetti = 0;
  let imponibileSpese = 0;
  let ivaTot = 0;

  for (const r of righeNorm) {
    const net = totaleNettoRigaOrdine(r);
    const ivaPct = ivaPercentForRiga(r, trasportoIvaPercent);
    const isSpesa =
      "meta" in r && r.meta && isOrdineSpesaVariaRiga(r.meta as Record<string, unknown>);
    if (isSpesa) imponibileSpese += net;
    else imponibileOggetti += net;
    ivaTot += roundMoney(net * (ivaPct / 100));
  }

  const imponibileRighe = roundMoney(imponibileOggetti);
  const imponibileSpeseVarie = roundMoney(imponibileSpese);
  // ponytail: legacy `trasporto` column — prefer spese-varie righe; kept for ordini non migrati
  const trasportoLegacy = roundMoney(Math.max(0, Number(input.trasporto ?? 0) || 0));
  const imponibile = roundMoney(imponibileRighe + imponibileSpeseVarie + trasportoLegacy);
  const iva = roundMoney(ivaTot + roundMoney(trasportoLegacy * (trasportoIvaPercent / 100)));
  const totale = roundMoney(imponibile + iva);
  return { imponibileRighe, imponibileSpeseVarie, imponibile, iva, totale };
}
