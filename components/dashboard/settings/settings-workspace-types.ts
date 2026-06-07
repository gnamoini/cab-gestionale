export type SistemaSectionId =
  | "brand-personalizzazione"
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

export type SettingsNavEntry =
  | { kind: "group"; label: string }
  | { kind: "item"; id: SistemaSectionId; label: string };

export const SETTINGS_NAV_STRUCTURE: SettingsNavEntry[] = [
  { kind: "group", label: "Personalizzazione" },
  { kind: "item", id: "brand-personalizzazione", label: "Branding" },
  { kind: "group", label: "Operatività" },
  { kind: "item", id: "op-addetti", label: "Addetti" },
  { kind: "item", id: "op-dipendenti-assenze", label: "Tipi assenza dipendenti" },
  { kind: "item", id: "op-stati", label: "Stati lavorazioni" },
  { kind: "item", id: "op-priorita", label: "Priorità" },
  { kind: "group", label: "Magazzino" },
  { kind: "item", id: "mag-marche", label: "Marche ricambi" },
  { kind: "item", id: "mag-fornitori", label: "Fornitori alternativi" },
  { kind: "item", id: "mag-categorie", label: "Categorie" },
  { kind: "group", label: "Clienti commerciali" },
  { kind: "item", id: "cli-cliente", label: "Cliente" },
  { kind: "item", id: "cli-cantiere", label: "Cantiere" },
  { kind: "item", id: "cli-utilizzatore", label: "Utilizzatore" },
  { kind: "group", label: "Attrezzatura" },
  { kind: "item", id: "att-tipo", label: "Tipo attrezzatura" },
  { kind: "item", id: "att-marca", label: "Marca" },
  { kind: "item", id: "att-modello", label: "Modello" },
  { kind: "group", label: "Telaio" },
  { kind: "item", id: "tel-tipo", label: "Tipo telaio" },
  { kind: "item", id: "tel-marca", label: "Marca" },
  { kind: "item", id: "tel-modello", label: "Modello" },
  { kind: "group", label: "Sistema" },
  { kind: "item", id: "sys-economici", label: "Parametri economici" },
];

export const SETTINGS_NAV_ITEM_COUNT = SETTINGS_NAV_STRUCTURE.filter((e) => e.kind === "item").length;

export const SETTINGS_SECTION_DESCRIPTIONS: Partial<Record<SistemaSectionId, string>> = {
  "brand-personalizzazione": "Personalizza colore principale e logo dell'applicazione.",
  "op-addetti": "Elenco addetti lavorazioni con colori associati.",
  "op-dipendenti-assenze": "Tipi di assenza e sigle per la tabella presenze dipendenti.",
  "op-stati": "Stati del workflow lavorazioni e colori badge.",
  "op-priorita": "Priorità lavorazioni e colori di evidenziazione.",
  "mag-marche": "Marche ricambi e sconti fornitore per marca.",
  "mag-fornitori": "Fornitori alternativi e produttori collegati.",
  "mag-categorie": "Categorie per classificare i ricambi a magazzino.",
  "cli-cliente": "Clienti commerciali e sconto ricambi automatico nei preventivi.",
  "cli-cantiere": "Cantieri associati ai clienti.",
  "cli-utilizzatore": "Utilizzatori per anagrafiche mezzi e lavorazioni.",
  "att-tipo": "Tipologie di attrezzatura per mezzi e preventivi.",
  "att-marca": "Marche attrezzatura — base per i modelli collegati.",
  "att-modello": "Modelli per marca attrezzatura (gerarchia Marca → Modello).",
  "tel-tipo": "Tipologie telaio per identificazione mezzi.",
  "tel-marca": "Marche telaio — base per i modelli collegati.",
  "tel-modello": "Modelli per marca telaio (gerarchia Marca → Modello).",
  "sys-economici": "Parametri economici di default per preventivi e report.",
};

export function settingsNavGroupForSection(sectionId: SistemaSectionId): string {
  let lastGroup = "";
  for (const e of SETTINGS_NAV_STRUCTURE) {
    if (e.kind === "group") lastGroup = e.label;
    else if (e.id === sectionId) return lastGroup;
  }
  return "";
}
