import { isCaptureMultilineFieldKey } from "@/lib/document-capture/capture-field-display-value";
import { emptySchedaIngressoFields } from "@/lib/domain/intervento-context/build-intervento-context";
import { findAddettoByStoredName, addettoDisplayName, type AddettoRecord } from "@/lib/lavorazioni/addetto-model";
import { findDuplicateByCodici } from "@/lib/magazzino/duplicates";
import type { RicambioMagazzino } from "@/lib/magazzino/types";
import { newRigaId, newSchedaMeta } from "@/lib/schede/schede-ui";
import type {
  LavorazioneSchedeBundle,
  RigaLavorazioneScheda,
  RigaRicambioScheda,
  SchedaIngressoFields,
  SchedaLavorazioniFields,
  SchedaRicambiFields,
  SchedaTipo,
} from "@/types/schede";

const INGRESSO_KEY_MAP: Record<string, keyof SchedaIngressoFields> = {
  cliente: "cliente",
  cantiere: "cantiere",
  utilizzatore: "utilizzatore",
  dataingresso: "dataIngresso",
  data_ingresso: "dataIngresso",
  tipoattrezzatura: "tipoAttrezzatura",
  tipo_attrezzatura: "tipoAttrezzatura",
  marcaattrezzatura: "marcaAttrezzatura",
  marca_attrezzatura: "marcaAttrezzatura",
  attrezzatura_marca: "marcaAttrezzatura",
  modelloattrezzatura: "modelloAttrezzatura",
  modello_attrezzatura: "modelloAttrezzatura",
  attrezzatura_modello: "modelloAttrezzatura",
  matricola: "matricola",
  attrezzatura_matricola: "matricola",
  nscuderia: "nScuderia",
  n_scuderia: "nScuderia",
  numero_scuderia: "nScuderia",
  orelavoro: "oreLavoro",
  ore_lavoro: "oreLavoro",
  ore: "oreLavoro",
  tipotelaio: "tipoTelaio",
  tipo_telaio: "tipoTelaio",
  marcatelaio: "marcaTelaio",
  marca_telaio: "marcaTelaio",
  telaio_marca: "marcaTelaio",
  modellotelaio: "modelloTelaio",
  modello_telaio: "modelloTelaio",
  telaio_modello: "modelloTelaio",
  targa: "targa",
  vin: "vin",
  numero_vin: "vin",
  telaio_vin: "vin",
  km: "km",
  descrizioneanomalia: "descrizioneAnomalia",
  descrizione_anomalia: "descrizioneAnomalia",
  livellocarburante: "livelloCarburante",
  livello_carburante: "livelloCarburante",
  addettoaccettazione: "addettoAccettazione",
  addetto_accettazione: "addettoAccettazione",
  richiedente: "richiedente",
  telefono: "richiedenteTelefono",
  telefono_richiedente: "richiedenteTelefono",
  richiedentetelefono: "richiedenteTelefono",
  noteintervento: "noteIntervento",
  note_intervento: "noteIntervento",
  note: "noteIntervento",
  richiedentefirma: "richiedenteFirma",
  richiedente_firma: "richiedenteFirma",
  firma_richiedente: "richiedenteFirma",
  firma_autista: "richiedenteFirma",
  addettofirma: "addettoFirma",
  addetto_firma: "addettoFirma",
  firma_addetto: "addettoFirma",
  firma_addetto_officina: "addettoFirma",
};

const MAX_LAVORAZIONI_RIGHE = 24;
const MAX_RICAMBI_RIGHE = 34;
/** ponytail: pattern targa IT semplificato — upgrade se servono formati storici/estero */
const IT_TARGA_RE = /^[A-Z]{2}\s?\d{3}\s?[A-Z]{2}$/i;

function normKey(key: string): string {
  return key.trim().toLowerCase().replace(/^ingresso\./, "");
}

export type CaptureFieldRow = {
  field_key: string;
  confirmed_value?: string | null;
  normalized_value: string | null;
  raw_value?: string | null;
};

export function resolveCaptureFieldValue(row: CaptureFieldRow): string {
  const v = isCaptureMultilineFieldKey(row.field_key)
    ? (row.confirmed_value ?? row.raw_value ?? row.normalized_value ?? "")
    : (row.confirmed_value ?? row.normalized_value ?? "");
  return typeof v === "string" ? v.trim() : "";
}

export function resolveRawFieldValue(fields: readonly CaptureFieldRow[], ...keys: string[]): string {
  for (const key of keys) {
    const hit = fields.find((row) => normKey(row.field_key) === key);
    if (!hit) continue;
    const v = resolveCaptureFieldValue(hit);
    if (v) return v;
  }
  return "";
}

function composeRichiedenteFromCapture(fields: readonly CaptureFieldRow[], current: string): string {
  if (current.trim()) return current.trim();
  const nome = resolveRawFieldValue(fields, "nome");
  const cognome = resolveRawFieldValue(fields, "cognome");
  return [nome, cognome].filter(Boolean).join(" ").trim();
}

function applyIngressoSlice(target: SchedaIngressoFields, slice: Partial<SchedaIngressoFields>): void {
  for (const key of Object.keys(slice) as (keyof SchedaIngressoFields)[]) {
    const v = slice[key];
    if (v !== undefined && v !== null && String(v).trim()) {
      (target as Record<string, string>)[key] = String(v);
    }
  }
}

function parseCaptureOre(value: string): number {
  const n = parseFloat(value.replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function parseCaptureQuantita(value: string): number {
  const n = parseFloat(value.replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function composeCaptureRicambioNome(nome: string, descrizione: string): string {
  const n = nome.trim();
  const d = descrizione.trim();
  if (n && d) return `${n} — ${d}`;
  return n || d;
}

export function inferCaptureSchedaTipo(fields: readonly CaptureFieldRow[]): SchedaTipo | null {
  const explicit = resolveRawFieldValue(fields, "schedatipo", "scheda_tipo").toLowerCase();
  if (explicit === "lavorazioni" || explicit === "ingresso" || explicit === "ricambi") {
    return explicit;
  }
  for (let n = 1; n <= MAX_LAVORAZIONI_RIGHE; n += 1) {
    if (resolveRawFieldValue(fields, `riga_${n}_lavorazione`, `riga_${n}_ore`)) {
      return "lavorazioni";
    }
  }
  for (let n = 1; n <= MAX_RICAMBI_RIGHE; n += 1) {
    if (
      resolveRawFieldValue(
        fields,
        `riga_${n}_codice`,
        `riga_${n}_descrizione`,
        `riga_${n}_qt`,
        `riga_${n}_nome`,
        `riga_${n}_data`,
      )
    ) {
      return "ricambi";
    }
  }
  return null;
}

export function mapCaptureHeaderToIngressoSlice(fields: readonly CaptureFieldRow[]): Partial<SchedaIngressoFields> {
  const cliente = resolveRawFieldValue(fields, "cliente");
  const targaMatricola = resolveRawFieldValue(fields, "targa_matricola", "targamatricola", "targa/matricola");
  const patch: Partial<SchedaIngressoFields> = {};
  if (cliente) patch.cliente = cliente;
  if (targaMatricola) {
    const compact = targaMatricola.replace(/\s/g, "");
    if (IT_TARGA_RE.test(compact)) {
      patch.targa = targaMatricola;
    } else {
      patch.matricola = targaMatricola;
    }
  }
  return patch;
}

export function parseCaptureLavorazioniRighe(
  fields: readonly CaptureFieldRow[],
  addettiRecords?: readonly AddettoRecord[],
): RigaLavorazioneScheda[] {
  const today = new Date().toLocaleDateString("it-IT");
  const out: RigaLavorazioneScheda[] = [];
  for (let n = 1; n <= MAX_LAVORAZIONI_RIGHE; n += 1) {
    const lavorazione = resolveRawFieldValue(fields, `riga_${n}_lavorazione`);
    const nomeRaw = resolveRawFieldValue(fields, `riga_${n}_nome`);
    const addettoRec = addettiRecords?.length ? findAddettoByStoredName(addettiRecords, nomeRaw) : undefined;
    const nome = addettoRec ? addettoDisplayName(addettoRec) : nomeRaw;
    const oreRaw = resolveRawFieldValue(fields, `riga_${n}_ore`);
    if (!lavorazione && !nome && !oreRaw) continue;
    out.push({
      id: newRigaId(),
      dataLavorazione: today,
      lavorazioniEffettuate: lavorazione,
      addettiAssegnati: nome || oreRaw ? [{ addetto: nome, oreImpiegate: parseCaptureOre(oreRaw) }] : [],
    });
  }
  return out;
}

export function mapCaptureFieldsToLavorazioni(
  fields: readonly CaptureFieldRow[],
  addettiRecords?: readonly AddettoRecord[],
): SchedaLavorazioniFields {
  const targaMatricola = resolveRawFieldValue(fields, "targa_matricola", "targamatricola", "targa/matricola");
  return {
    identificazioneMacchina: targaMatricola,
    righe: parseCaptureLavorazioniRighe(fields, addettiRecords),
  };
}

export function parseCaptureRicambiRighe(
  fields: readonly CaptureFieldRow[],
  magazzino?: readonly RicambioMagazzino[],
): RigaRicambioScheda[] {
  const today = new Date().toLocaleDateString("it-IT");
  const out: RigaRicambioScheda[] = [];
  for (let n = 1; n <= MAX_RICAMBI_RIGHE; n += 1) {
    const nome = resolveRawFieldValue(fields, `riga_${n}_nome`);
    const codice = resolveRawFieldValue(fields, `riga_${n}_codice`);
    const dup = codice && magazzino?.length ? findDuplicateByCodici([...magazzino], codice) : null;
    const descrizione = resolveRawFieldValue(fields, `riga_${n}_descrizione`);
    const qtRaw = resolveRawFieldValue(fields, `riga_${n}_qt`);
    const data = resolveRawFieldValue(fields, `riga_${n}_data`);
    if (!nome && !codice && !descrizione && !qtRaw && !data) continue;
    out.push({
      id: newRigaId(),
      ricambioId: dup?.id ?? null,
      ricambioNome: composeCaptureRicambioNome(nome, descrizione),
      codice: dup?.codiceFornitoreOriginale ?? codice,
      quantita: parseCaptureQuantita(qtRaw),
      addetto: "",
      dataUtilizzo: data || today,
    });
  }
  return out;
}

export function mapCaptureFieldsToRicambi(
  fields: readonly CaptureFieldRow[],
  magazzino?: readonly RicambioMagazzino[],
): SchedaRicambiFields {
  const targaMatricola = resolveRawFieldValue(fields, "targa_matricola", "targamatricola", "targa/matricola");
  return {
    identificazioneMacchina: targaMatricola,
    righe: parseCaptureRicambiRighe(fields, magazzino),
  };
}

export function mapCaptureFieldsToIngresso(
  fields: readonly CaptureFieldRow[],
  addettiRecords?: readonly AddettoRecord[],
): SchedaIngressoFields {
  const out = emptySchedaIngressoFields();
  for (const row of fields) {
    const mapped = INGRESSO_KEY_MAP[normKey(row.field_key)];
    if (!mapped || mapped === "targetType" || mapped === "attrezzaturaId") continue;
    out[mapped] = resolveCaptureFieldValue(row);
  }
  out.richiedente = composeRichiedenteFromCapture(fields, out.richiedente);
  if (out.addettoAccettazione.trim() && addettiRecords?.length) {
    const rec = findAddettoByStoredName(addettiRecords, out.addettoAccettazione);
    if (rec) out.addettoAccettazione = addettoDisplayName(rec);
  }
  applyIngressoSlice(out, mapCaptureHeaderToIngressoSlice(fields));
  if (!out.dataIngresso.trim()) {
    out.dataIngresso = new Date().toLocaleDateString("it-IT");
  }
  return out;
}

function emptyLavorazioniFields(): SchedaLavorazioniFields {
  return { identificazioneMacchina: "", righe: [] };
}

function emptyRicambiFields(): SchedaRicambiFields {
  return { identificazioneMacchina: "", righe: [] };
}

function buildLavorazioniFromIngresso(ingressoFields: SchedaIngressoFields): SchedaLavorazioniFields {
  return {
    ...emptyLavorazioniFields(),
    identificazioneMacchina:
      [ingressoFields.marcaAttrezzatura, ingressoFields.modelloAttrezzatura, ingressoFields.matricola]
        .filter(Boolean)
        .join(" ")
        .trim() || ingressoFields.targa,
    righe: [
      {
        id: newRigaId(),
        dataLavorazione: ingressoFields.dataIngresso,
        lavorazioniEffettuate: ingressoFields.descrizioneAnomalia || ingressoFields.noteIntervento,
        addettiAssegnati: ingressoFields.addettoAccettazione
          ? [{ addetto: ingressoFields.addettoAccettazione, oreImpiegate: 0 }]
          : [],
      },
    ],
  };
}

function buildRicambiFromIngresso(ingressoFields: SchedaIngressoFields): SchedaRicambiFields {
  return {
    ...emptyRicambiFields(),
    identificazioneMacchina:
      [ingressoFields.marcaAttrezzatura, ingressoFields.modelloAttrezzatura].filter(Boolean).join(" ").trim() ||
      ingressoFields.targa,
  };
}

export function buildCaptureSchedeBundle(input: {
  lavorazioneId: string;
  fields: readonly CaptureFieldRow[];
  createdBy: string;
  includeLavorazioni?: boolean;
  includeRicambi?: boolean;
  schedaTipo?: SchedaTipo | null;
  addettiRecords?: readonly AddettoRecord[];
  magazzino?: readonly RicambioMagazzino[];
}): LavorazioneSchedeBundle {
  const schedaTipo = input.schedaTipo ?? inferCaptureSchedaTipo(input.fields);
  const ingressoFields = mapCaptureFieldsToIngresso(input.fields, input.addettiRecords);
  const user = input.createdBy.trim() || "Document Capture";

  const bundle: LavorazioneSchedeBundle = {
    lavorazioneId: input.lavorazioneId,
    codice: null,
    ingresso: {
      ...newSchedaMeta("ingresso", user),
      tipo: "ingresso",
      campi: ingressoFields,
    },
    lavorazioni: null,
    ricambi: null,
  };

  if (input.includeLavorazioni) {
    const lavCampi =
      schedaTipo === "lavorazioni"
        ? mapCaptureFieldsToLavorazioni(input.fields, input.addettiRecords)
        : buildLavorazioniFromIngresso(ingressoFields);
    bundle.lavorazioni = {
      ...newSchedaMeta("lavorazioni", user),
      tipo: "lavorazioni",
      campi: lavCampi,
    };
  }

  if (input.includeRicambi) {
    const ricCampi =
      schedaTipo === "ricambi"
        ? mapCaptureFieldsToRicambi(input.fields, input.magazzino)
        : buildRicambiFromIngresso(ingressoFields);
    bundle.ricambi = {
      ...newSchedaMeta("ricambi", user),
      tipo: "ricambi",
      campi: ricCampi,
    };
  }

  return bundle;
}

export async function fetchCaptureFieldRows(captureId: string): Promise<CaptureFieldRow[]> {
  const res = await fetch(`/api/document-capture/${captureId}/fields`);
  if (!res.ok) throw new Error("Impossibile caricare i dati letti");
  const body = (await res.json()) as {
    fields?: Array<{
      field_key: string;
      confirmed_value: string | null;
      normalized_value: string | null;
      raw_value?: string | null;
    }>;
  };
  return (body.fields ?? []).map((f) => ({
    field_key: f.field_key,
    confirmed_value: f.confirmed_value,
    normalized_value: f.normalized_value,
    raw_value: f.raw_value ?? null,
  }));
}

export async function fetchCaptureIngressoFields(captureId: string): Promise<SchedaIngressoFields> {
  return mapCaptureFieldsToIngresso(await fetchCaptureFieldRows(captureId));
}

export function buildCaptureBundleSchedaPatch(input: {
  lavorazioneId: string;
  schedaTipo: "lavorazioni" | "ricambi";
  fields: readonly CaptureFieldRow[];
  createdBy: string;
  addettiRecords?: readonly AddettoRecord[];
  magazzino?: readonly RicambioMagazzino[];
}): Pick<LavorazioneSchedeBundle, "lavorazioni" | "ricambi"> {
  const bundle = buildCaptureSchedeBundle({
    lavorazioneId: input.lavorazioneId,
    fields: input.fields,
    createdBy: input.createdBy,
    includeLavorazioni: input.schedaTipo === "lavorazioni",
    includeRicambi: input.schedaTipo === "ricambi",
    schedaTipo: input.schedaTipo,
    addettiRecords: input.addettiRecords,
    magazzino: input.magazzino,
  });
  return { lavorazioni: bundle.lavorazioni, ricambi: bundle.ricambi };
}

export function mergeCaptureBundlePatch(
  base: LavorazioneSchedeBundle,
  patch: Pick<LavorazioneSchedeBundle, "lavorazioni" | "ricambi">,
): LavorazioneSchedeBundle {
  return {
    ...base,
    lavorazioni: patch.lavorazioni ?? base.lavorazioni,
    ricambi: patch.ricambi ?? base.ricambi,
  };
}
