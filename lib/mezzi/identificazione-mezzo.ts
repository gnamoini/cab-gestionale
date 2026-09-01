import type { InterventoDisplay } from "@/lib/domain/intervento-context/intervento-context.types";
import type { MezzoGestito } from "@/lib/mezzi/types";
import { normalizeEntityString, scoreEntityMatch } from "@/lib/validation/global-entity-validation";
import { lavorazioneDisplayCodice } from "@/lib/lavorazioni/lavorazione-codice";
import type { LavorazioneArchiviata, LavorazioneAttiva } from "@/lib/lavorazioni/types";
import type { SchedaIngressoFields } from "@/types/schede";

/** Campi ordinati per intestazioni professionali (solo valori presenti in output). */
export type MezzoIdentificazioneParts = {
  targa?: string;
  matricola?: string;
  nScuderia?: string;
  marcaAttrezzatura?: string;
  modelloAttrezzatura?: string;
  cliente?: string;
  cantiere?: string;
  utilizzatore?: string;
  marcaTelaio?: string;
  modelloTelaio?: string;
  vin?: string;
};

const ORDER: { key: keyof MezzoIdentificazioneParts; label: string }[] = [
  { key: "targa", label: "Targa" },
  { key: "matricola", label: "Matricola" },
  { key: "nScuderia", label: "Scuderia" },
  { key: "marcaAttrezzatura", label: "Marca attrezzatura" },
  { key: "modelloAttrezzatura", label: "Modello" },
  { key: "cliente", label: "Cliente" },
  { key: "cantiere", label: "Cantiere" },
  { key: "utilizzatore", label: "Utilizzatore" },
];

function clean(s: string | undefined | null): string | undefined {
  const t = String(s ?? "").trim();
  if (!t || t === "—") return undefined;
  return t;
}

/** Es. `Targa: AB123CD • Matricola: MX…` — solo campi valorizzati. */
export function formatIdentificazioneMezzoLine(parts: MezzoIdentificazioneParts): string {
  const segments: string[] = [];
  for (const { key, label } of ORDER) {
    const v = clean(parts[key] as string | undefined);
    if (v) segments.push(`${label}: ${v}`);
  }
  return segments.join(" • ");
}

export type IdentificazioneMezzoBandId = "cliente" | "attrezzatura" | "telaio";

export type IdentificazioneMezzoBand = {
  id: IdentificazioneMezzoBandId;
  line: string;
};

function joinIdentificazioneBandValues(...values: (string | undefined | null)[]): string {
  return values.map((v) => clean(v)).filter(Boolean).join(" · ");
}

/** Bande CLIENTE / ATTREZZATURE / TELAIO per UI scheda (allineato a `formatMezzoPickerBands`). */
export function formatIdentificazioneMezzoBands(parts: MezzoIdentificazioneParts): IdentificazioneMezzoBand[] {
  const bands: IdentificazioneMezzoBand[] = [
    {
      id: "cliente",
      line: joinIdentificazioneBandValues(parts.cliente, parts.cantiere, parts.utilizzatore),
    },
    {
      id: "attrezzatura",
      line: joinIdentificazioneBandValues(
        parts.marcaAttrezzatura,
        parts.modelloAttrezzatura,
        parts.matricola,
        parts.nScuderia,
      ),
    },
    {
      id: "telaio",
      line: joinIdentificazioneBandValues(
        parts.marcaTelaio,
        parts.modelloTelaio,
        parts.targa,
        parts.vin,
      ),
    },
  ];
  return bands.filter((b) => b.line.length > 0);
}

/** Subtitle modale hub lavorazione: `Cliente • Marca • Targa · Matricola · Scud. …`. */
export function formatLavorazioneHubSubtitle(parts: MezzoIdentificazioneParts): string {
  const segments: string[] = [];
  const cliente = clean(parts.cliente);
  const marca = clean(parts.marcaAttrezzatura) ?? clean(parts.modelloAttrezzatura);
  if (cliente) segments.push(cliente);
  if (marca) segments.push(marca);

  const identSegs: string[] = [];
  const targa = clean(parts.targa);
  const matricola = clean(parts.matricola);
  const nScuderia = clean(parts.nScuderia);
  if (targa) identSegs.push(targa);
  if (matricola) identSegs.push(matricola);
  if (nScuderia) identSegs.push(`Scud. ${nScuderia}`);
  if (identSegs.length > 0) segments.push(identSegs.join(" · "));

  return segments.join(" • ");
}

/** Subtitle modale dettaglio: `26-0001 · Cliente • Marca • Targa …`. */
export function formatLavorazioneDetailHeaderSubtitle(
  parts: MezzoIdentificazioneParts,
  lavorazione: { id: string; codice?: string | null },
): string {
  const codice = lavorazioneDisplayCodice(lavorazione);
  const ident = formatLavorazioneHubSubtitle(parts);
  return ident ? `${codice} · ${ident}` : codice;
}

export function identificazionePartsFromLavorazione(
  lav: LavorazioneAttiva | LavorazioneArchiviata,
  mezzo: MezzoGestito | null,
): MezzoIdentificazioneParts {
  const targa = clean(lav.targa);
  const matricola = clean(lav.matricola);
  const nScuderia = clean(lav.nScuderia) ?? clean(mezzo?.numeroScuderia);
  const marcaM = clean(mezzo?.marca);
  const modelloM = clean(mezzo?.modello);
  const macchinaLav = clean(lav.macchina);
  const marcaAttrezzatura = marcaM;
  let modelloAttrezzatura = modelloM;
  if (!marcaAttrezzatura && !modelloAttrezzatura && macchinaLav) {
    modelloAttrezzatura = macchinaLav;
  } else if (marcaAttrezzatura && !modelloAttrezzatura && macchinaLav && !mezzo) {
    modelloAttrezzatura = macchinaLav;
  }
  return {
    targa,
    matricola,
    nScuderia,
    marcaAttrezzatura,
    modelloAttrezzatura,
    cliente: clean(lav.cliente),
    cantiere: undefined,
    utilizzatore: clean(lav.utilizzatore),
  };
}

export function identificazionePartsFromInterventoDisplay(
  display: InterventoDisplay,
): MezzoIdentificazioneParts {
  return {
    targa: clean(display.targa.value),
    matricola: clean(display.matricola.value),
    nScuderia: clean(display.nScuderia.value),
    marcaAttrezzatura: clean(display.marcaAttrezzatura.value),
    modelloAttrezzatura: clean(display.modelloAttrezzatura.value),
    cliente: clean(display.cliente.value),
    cantiere: clean(display.cantiere.value),
    utilizzatore: clean(display.utilizzatore.value),
    marcaTelaio: clean(display.marcaTelaio.value),
    modelloTelaio: clean(display.modelloTelaio.value),
    vin: clean(display.vin.value),
  };
}

export function identificazionePartsFromSchedaIngresso(f: SchedaIngressoFields): MezzoIdentificazioneParts {
  return {
    targa: clean(f.targa),
    matricola: clean(f.matricola),
    nScuderia: clean(f.nScuderia),
    marcaAttrezzatura: clean(f.marcaAttrezzatura),
    modelloAttrezzatura: clean(f.modelloAttrezzatura),
    cliente: clean(f.cliente),
    cantiere: clean(f.cantiere),
    utilizzatore: clean(f.utilizzatore),
    marcaTelaio: clean(f.marcaTelaio),
    modelloTelaio: clean(f.modelloTelaio),
    vin: clean(f.vin),
  };
}

export function identificazionePartsFromMezzo(mezzo: MezzoGestito): MezzoIdentificazioneParts {
  return {
    targa: clean(mezzo.targa),
    matricola: clean(mezzo.matricola),
    nScuderia: clean(mezzo.numeroScuderia),
    marcaAttrezzatura: clean(mezzo.marca),
    modelloAttrezzatura: clean(mezzo.modello),
    cliente: clean(mezzo.cliente),
    cantiere: clean(mezzo.cantiere),
    utilizzatore: clean(mezzo.utilizzatore),
    marcaTelaio: clean(mezzo.marcaTelaio),
    modelloTelaio: clean(mezzo.modelloTelaio),
    vin: clean(mezzo.vin),
  };
}

/** Ricerca su anagrafica mezzi (targa, matricola, scuderia, cliente, marca, modello, utilizzatore, tipo). */
export function mezzoMatchesSmartQuery(mezzo: MezzoGestito, raw: string): boolean {
  const q = normalizeEntityString(raw);
  if (!q) return true;
  const hay = [
    mezzo.targa,
    mezzo.matricola,
    mezzo.numeroScuderia,
    mezzo.cliente,
    mezzo.marca,
    mezzo.modello,
    mezzo.utilizzatore,
    mezzo.tipoAttrezzatura,
    `${mezzo.marca} ${mezzo.modello}`,
  ]
    .filter(Boolean)
    .map((s) => normalizeEntityString(String(s)))
    .join(" ");
  if (hay.includes(q)) return true;
  return q.split(/\s+/).filter(Boolean).every((w) => w.length > 0 && (hay.includes(w) || scoreEntityMatch(w, hay) > 0));
}
