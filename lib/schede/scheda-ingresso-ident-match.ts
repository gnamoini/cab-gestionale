import { normalizeVehicleIdentifier } from "@/lib/schede/normalize-vehicle-identifier";
import type { SchedaIngressoFields } from "@/types/schede";

export type SchedaIngressoLookupIdent = {
  targa: string;
  matricola: string;
  nScuderia: string;
  vin?: string;
};

/** Match stretto su campi scheda ingresso: targa / matricola / scuderia / VIN. */
export function schedaIngressoCampiMatchIdent(
  campi: SchedaIngressoFields,
  ident: SchedaIngressoLookupIdent,
): boolean {
  const pairs = [
    { cap: normalizeVehicleIdentifier("targa", ident.targa), ing: normalizeVehicleIdentifier("targa", campi.targa) },
    {
      cap: normalizeVehicleIdentifier("matricola", ident.matricola),
      ing: normalizeVehicleIdentifier("matricola", campi.matricola),
    },
    {
      cap: normalizeVehicleIdentifier("scuderia", ident.nScuderia),
      ing: normalizeVehicleIdentifier("scuderia", campi.nScuderia),
    },
    { cap: normalizeVehicleIdentifier("vin", ident.vin), ing: normalizeVehicleIdentifier("vin", campi.vin) },
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
