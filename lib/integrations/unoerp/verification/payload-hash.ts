import { moneyStringFromNumber } from "@/lib/integrations/unoerp/monetary/decimal-policy";

export type CabOwnedSnapshot = {
  documentType: string;
  cabId: string;
  sourceVersion: number;
  customerLabel: string;
  lines: Array<{ descrizione: string; quantita: string; prezzo: string; sconto: string }>;
  totale: string;
  ddt?: { anno: number; serie: string; numero: number | null };
};

export function hashCabOwnedSnapshot(s: CabOwnedSnapshot): string {
  const canonical = JSON.stringify(s);
  let h = 5381;
  for (let i = 0; i < canonical.length; i++) h = (h * 33) ^ canonical.charCodeAt(i);
  return (h >>> 0).toString(16);
}

export function lineMoney(qty: number, price: number, scontoPercent: number): string {
  const net = price * (1 - scontoPercent / 100);
  return moneyStringFromNumber(qty * net);
}
