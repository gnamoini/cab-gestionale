import type { GestionaleLogViewModel } from "@/lib/gestionale-log/view-model";
import type { TipoAssenzaConfig } from "@/lib/dipendenti/tipi-assenza-model";
import type { AddettoRecord } from "@/lib/lavorazioni/addetto-model";
import type { PrioritaLav, StatoLavorazioneConfig } from "@/lib/lavorazioni/types";
import type { MagazzinoMasterPrefs } from "@/lib/magazzino/magazzino-master-prefs-storage";
import type { PrioritaLavorazione } from "@/src/types/supabase-tables";
import type { MezziListePrefs } from "@/lib/mezzi/mezzi-liste-prefs-storage";
import type { SistemaPreventiviDefaults } from "@/lib/sistema/sistema-preventivi-defaults-storage";

export type ConfigurazioneSettingsSnapshot = {
  stati: StatoLavorazioneConfig[];
  addettiRecords: AddettoRecord[];
  addettoColors: Record<string, string>;
  prioritaColors: Partial<Record<PrioritaLav, string>>;
  prioritaDb: PrioritaLavorazione[];
  mag: MagazzinoMasterPrefs;
  liste: MezziListePrefs;
  eco: SistemaPreventiviDefaults;
  tipiAssenza: TipoAssenzaConfig[];
};

export type ConfigurazioneSectionId =
  | "op-addetti"
  | "op-dipendenti-assenze"
  | "op-stati"
  | "op-priorita"
  | "mag-marche"
  | "mag-fornitori"
  | "mag-categorie"
  | "cli-cliente"
  | "cli-cantiere"
  | "cli-utilizzatore"
  | "att-tipo"
  | "att-marca"
  | "att-modello"
  | "tel-tipo"
  | "tel-marca"
  | "tel-modello"
  | "sys-economici";

export const CONFIGURAZIONE_SECTION_LABELS: Record<ConfigurazioneSectionId, string> = {
  "op-addetti": "Addetti",
  "op-dipendenti-assenze": "Tipi assenza dipendenti",
  "op-stati": "Stati lavorazioni",
  "op-priorita": "Priorità",
  "mag-marche": "Marche ricambi",
  "mag-fornitori": "Fornitori alternativi",
  "mag-categorie": "Categorie",
  "cli-cliente": "Cliente",
  "cli-cantiere": "Cantiere",
  "cli-utilizzatore": "Utilizzatore",
  "att-tipo": "Tipo attrezzatura",
  "att-marca": "Marca attrezzatura",
  "att-modello": "Modello attrezzatura",
  "tel-tipo": "Tipo telaio",
  "tel-marca": "Marca telaio",
  "tel-modello": "Modello telaio",
  "sys-economici": "Parametri economici",
};

function sliceKey(value: unknown): string {
  return JSON.stringify(value);
}

type SectionSlice = {
  id: ConfigurazioneSectionId;
  pick: (s: ConfigurazioneSettingsSnapshot) => unknown;
};

const SECTION_SLICES: SectionSlice[] = [
  {
    id: "op-addetti",
    pick: (s) => ({ addettiRecords: s.addettiRecords, addettoColors: s.addettoColors }),
  },
  { id: "op-dipendenti-assenze", pick: (s) => s.tipiAssenza },
  { id: "op-stati", pick: (s) => s.stati },
  {
    id: "op-priorita",
    pick: (s) => ({ prioritaColors: s.prioritaColors, prioritaDb: s.prioritaDb }),
  },
  {
    id: "mag-marche",
    pick: (s) => ({
      marche: s.mag.marche,
      scontoFornitoreByMarca: s.mag.scontoFornitoreByMarca,
      mezziCompatibili: s.mag.mezziCompatibili,
    }),
  },
  { id: "mag-fornitori", pick: (s) => s.mag.fornitori },
  { id: "mag-categorie", pick: (s) => s.mag.categorie },
  {
    id: "cli-cliente",
    pick: (s) => ({ clienti: s.liste.clienti, scontoRicambiByCliente: s.liste.scontoRicambiByCliente }),
  },
  { id: "cli-cantiere", pick: (s) => s.liste.cantieri },
  { id: "cli-utilizzatore", pick: (s) => s.liste.utilizzatori },
  { id: "att-tipo", pick: (s) => s.liste.tipiAttrezzatura },
  { id: "att-marca", pick: (s) => s.liste.attrezzature },
  { id: "att-modello", pick: (s) => s.liste.attrezzature },
  { id: "tel-tipo", pick: (s) => s.liste.tipiTelaio },
  { id: "tel-marca", pick: (s) => s.liste.telai },
  { id: "tel-modello", pick: (s) => s.liste.telai },
  { id: "sys-economici", pick: (s) => s.eco },
];

/** Voci log per ogni sezione configurazione modificata al salvataggio. */
export function buildConfigurazioneLogEntriesFromSnapshotDiff(
  before: ConfigurazioneSettingsSnapshot,
  after: ConfigurazioneSettingsSnapshot,
  autore: string,
): GestionaleLogViewModel[] {
  const name = autore.trim() || "Operatore";
  const atIso = new Date().toISOString();
  const changed = new Set<ConfigurazioneSectionId>();

  for (const { id, pick } of SECTION_SLICES) {
    if (sliceKey(pick(before)) !== sliceKey(pick(after))) {
      changed.add(id);
    }
  }

  if (changed.size === 0) {
    return [
      {
        tone: "update",
        tipoRiga: "MODIFICA CONFIGURAZIONE",
        oggettoRiga: "Configurazione globale",
        modificaRiga: `• ${name} ha salvato la configurazione`,
        autore: name,
        atIso,
      },
    ];
  }

  const out: GestionaleLogViewModel[] = [];
  const skipIds = new Set<ConfigurazioneSectionId>(["att-modello", "tel-modello"]);

  for (const id of SECTION_SLICES.map((s) => s.id)) {
    if (!changed.has(id) || skipIds.has(id)) continue;

    const label = CONFIGURAZIONE_SECTION_LABELS[id];
    out.push({
      tone: "update",
      tipoRiga: "MODIFICA CONFIGURAZIONE",
      oggettoRiga: label,
      modificaRiga: `• ${name} ha aggiornato «${label}»`,
      autore: name,
      atIso,
    });
  }

  return out;
}
