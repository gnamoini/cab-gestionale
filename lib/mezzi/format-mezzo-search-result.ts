import type { MezzoGestito } from "@/lib/mezzi/types";

function clean(s: string | undefined | null): string {
  const t = String(s ?? "").trim();
  if (!t || t === "—") return "";
  return t;
}

export type MezzoSearchResultLines = {
  primary: string;
  secondary: string;
  chipLabel: string;
};

/** Etichetta compatta per chip recenti (preferisce targa, poi matricola). */
export function formatMezzoSearchChipLabel(mezzo: MezzoGestito): string {
  return clean(mezzo.targa) || clean(mezzo.matricola) || clean(mezzo.cliente) || "Mezzo";
}

/** Righe display per risultato ricerca picker. */
export function formatMezzoSearchResultLines(mezzo: MezzoGestito): MezzoSearchResultLines {
  const targa = clean(mezzo.targa);
  const cliente = clean(mezzo.cliente);
  const matricola = clean(mezzo.matricola);
  const telaio =
    [clean(mezzo.marcaTelaio), clean(mezzo.modelloTelaio)].filter(Boolean).join(" ") || "";
  const attrezzatura = [clean(mezzo.marca), clean(mezzo.modello)].filter(Boolean).join(" ") || "";

  const primaryParts: string[] = [];
  if (targa) primaryParts.push(targa);
  if (cliente) primaryParts.push(cliente);
  const primary = primaryParts.join(" · ") || formatMezzoSearchChipLabel(mezzo);

  const secondaryParts: string[] = [];
  if (telaio) secondaryParts.push(telaio);
  if (attrezzatura) secondaryParts.push(attrezzatura);
  if (matricola) secondaryParts.push(`Matr. ${matricola}`);
  const secondary = secondaryParts.join(" · ");

  return {
    primary,
    secondary,
    chipLabel: formatMezzoSearchChipLabel(mezzo),
  };
}
