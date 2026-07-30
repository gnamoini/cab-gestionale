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

export type MezzoPickerField = {
  label: string;
  value: string;
};

export type MezzoPickerBand = {
  id: "cliente" | "attrezzatura" | "telaio";
  fields: MezzoPickerField[];
};

/** Etichetta compatta per chip recenti (preferisce targa, poi matricola). */
export function formatMezzoSearchChipLabel(mezzo: MezzoGestito): string {
  return clean(mezzo.targa) || clean(mezzo.matricola) || clean(mezzo.cliente) || "Mezzo";
}

/** Righe display per risultato ricerca picker (legacy compat). */
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

function bandFields(defs: { label: string; value: string }[]): MezzoPickerField[] {
  return defs.filter((d) => d.value.length > 0);
}

/** Bande strutturate per picker mezzi — campi vuoti omessi, banda omessa se vuota. */
export function formatMezzoPickerBands(mezzo: MezzoGestito): MezzoPickerBand[] {
  const bands: MezzoPickerBand[] = [
    {
      id: "cliente",
      fields: bandFields([
        { label: "Cliente", value: clean(mezzo.cliente) },
        { label: "Cantiere", value: clean(mezzo.cantiere) },
        { label: "Utilizzatore", value: clean(mezzo.utilizzatore) },
      ]),
    },
    {
      id: "attrezzatura",
      fields: bandFields([
        { label: "Marca attrezzatura", value: clean(mezzo.marca) },
        { label: "Modello", value: clean(mezzo.modello) },
        { label: "Matricola", value: clean(mezzo.matricola) },
        { label: "Scuderia", value: clean(mezzo.numeroScuderia) },
      ]),
    },
    {
      id: "telaio",
      fields: bandFields([
        { label: "Marca telaio", value: clean(mezzo.marcaTelaio) },
        { label: "Modello", value: clean(mezzo.modelloTelaio) },
        { label: "Targa", value: clean(mezzo.targa) },
        { label: "VIN", value: clean(mezzo.vin) },
      ]),
    },
  ];
  return bands.filter((b) => b.fields.length > 0);
}

/** Righe compatte per picker — cliente in evidenza, dettagli mezzo su una riga. */
export function formatMezzoPickerCompactLines(mezzo: MezzoGestito): string[] {
  const bands = formatMezzoPickerBands(mezzo);
  if (bands.length === 0) return [];

  const bandLine = (band: MezzoPickerBand) => band.fields.map((f) => f.value).join(" · ");

  const clienteBand = bands.find((b) => b.id === "cliente");
  const detailBands = bands.filter((b) => b.id !== "cliente");

  if (clienteBand && detailBands.length > 0) {
    return [bandLine(clienteBand), detailBands.map(bandLine).join(" — ")];
  }
  if (clienteBand) return [bandLine(clienteBand)];
  if (detailBands.length === 1) return [bandLine(detailBands[0]!)];
  return detailBands.map(bandLine);
}
