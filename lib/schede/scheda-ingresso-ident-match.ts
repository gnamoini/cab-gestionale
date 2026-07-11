import type { SchedaIngressoFields } from "@/types/schede";

export type SchedaIngressoLookupIdent = {
  targa: string;
  matricola: string;
  nScuderia: string;
  vin?: string;
};

function safeStr(v: string | null | undefined): string {
  return typeof v === "string" ? v.trim() : "";
}

function normIdent(v: string | null | undefined): string {
  return safeStr(v).toLowerCase();
}

function normScuderia(v: string | null | undefined): string {
  const n = normIdent(v);
  if (!n || n === "—") return "";
  return n;
}

function normTarga(v: string | null | undefined): string {
  const n = normIdent(v);
  if (!n || n === "—") return "";
  return n;
}

function normMatricola(v: string | null | undefined): string {
  const n = normIdent(v);
  if (!n || n === "non assegnata" || n === "—") return "";
  return n;
}

function normVin(v: string | null | undefined): string {
  return safeStr(v).toUpperCase().replace(/\s/g, "");
}

/** Match stretto su campi scheda ingresso: targa / matricola / scuderia / VIN. */
export function schedaIngressoCampiMatchIdent(
  campi: SchedaIngressoFields,
  ident: SchedaIngressoLookupIdent,
): boolean {
  const pairs = [
    { cap: normTarga(ident.targa), ing: normTarga(campi.targa) },
    { cap: normMatricola(ident.matricola), ing: normMatricola(campi.matricola) },
    { cap: normScuderia(ident.nScuderia), ing: normScuderia(campi.nScuderia) },
    { cap: normVin(ident.vin), ing: normVin(campi.vin) },
  ];

  const provided = pairs.filter((p) => p.cap);
  if (provided.length === 0) return false;

  let matched = false;
  for (const { cap, ing } of provided) {
    if (!ing) continue;
    if (cap !== ing) return false;
    matched = true;
  }
  return matched;
}
