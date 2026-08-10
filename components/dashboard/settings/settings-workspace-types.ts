export type SistemaSectionId =
  | "sys-panoramica"
  | "brand-personalizzazione"
  | "op-addetti"
  | "op-dipendenti-assenze"
  | "op-stati"
  | "op-priorita"
  | "mag-marche"
  | "mag-fornitori"
  | "mag-produttori"
  | "mag-categorie"
  | "cli-cliente"
  | "cli-cantiere"
  | "cli-utilizzatore"
  | "att-tipo"
  | "att-piani-tagliando"
  | "att-marca"
  | "att-modello"
  | "tel-tipo"
  | "tel-marca"
  | "tel-modello"
  | "sys-officina-profilo"
  | "sys-stato-propagazioni"
  | "sys-economici"
  | "sys-comunicazioni"
  | "sys-tkb-kb";

export type SettingsNavEntry =
  | { kind: "group"; label: string }
  | { kind: "item"; id: SistemaSectionId; label: string };

export const SETTINGS_NAV_OVERVIEW_ID = "sys-panoramica" as const satisfies SistemaSectionId;

export const SETTINGS_NAV_STRUCTURE: SettingsNavEntry[] = [
  { kind: "item", id: SETTINGS_NAV_OVERVIEW_ID, label: "Panoramica" },
  { kind: "group", label: "Personalizzazione" },
  { kind: "item", id: "brand-personalizzazione", label: "Branding" },
  { kind: "group", label: "Operatività" },
  { kind: "item", id: "op-addetti", label: "Dipendenti" },
  { kind: "item", id: "op-dipendenti-assenze", label: "Tipi assenza dipendenti" },
  { kind: "item", id: "op-stati", label: "Stati lavorazioni" },
  { kind: "item", id: "op-priorita", label: "Priorità" },
  { kind: "group", label: "Magazzino" },
  { kind: "item", id: "mag-marche", label: "Marche ricambi" },
  { kind: "item", id: "mag-fornitori", label: "Fornitori alternativi" },
  { kind: "item", id: "mag-produttori", label: "Produttori" },
  { kind: "item", id: "mag-categorie", label: "Categorie" },
  { kind: "group", label: "Clienti commerciali" },
  { kind: "item", id: "cli-cliente", label: "Cliente" },
  { kind: "item", id: "cli-cantiere", label: "Cantiere" },
  { kind: "item", id: "cli-utilizzatore", label: "Utilizzatore" },
  { kind: "group", label: "Attrezzatura" },
  { kind: "item", id: "att-tipo", label: "Tipo attrezzatura" },
  { kind: "item", id: "att-marca", label: "Marca attrezzatura" },
  { kind: "item", id: "att-modello", label: "Modello attrezzatura" },
  { kind: "group", label: "Telaio" },
  { kind: "item", id: "tel-tipo", label: "Tipo telaio" },
  { kind: "item", id: "tel-marca", label: "Marca telaio" },
  { kind: "item", id: "tel-modello", label: "Modello telaio" },
  { kind: "group", label: "Comunicazioni" },
  { kind: "item", id: "sys-comunicazioni", label: "Comunicazioni" },
  { kind: "group", label: "Sistema" },
  { kind: "item", id: "sys-stato-propagazioni", label: "Stato propagazioni" },
  { kind: "item", id: "sys-officina-profilo", label: "Profilo officina" },
  { kind: "item", id: "sys-economici", label: "Parametri economici" },
  { kind: "item", id: "sys-tkb-kb", label: "Knowledge Base tecnica" },
];

export const SETTINGS_NAV_ITEM_COUNT = SETTINGS_NAV_STRUCTURE.filter((e) => e.kind === "item").length;

export function settingsNavGroupForSection(sectionId: SistemaSectionId): string {
  if (sectionId === SETTINGS_NAV_OVERVIEW_ID) return "Panoramica";
  let lastGroup = "";
  for (const e of SETTINGS_NAV_STRUCTURE) {
    if (e.kind === "group") lastGroup = e.label;
    else if (e.id === sectionId) return lastGroup;
  }
  return "";
}

export type SettingsNavGroup = {
  label: string;
  items: { id: SistemaSectionId; label: string }[];
};

/** Gruppi navigazione (esclusa Panoramica) per vista riepilogo. */
export function settingsNavGroupedItems(): SettingsNavGroup[] {
  const groups: SettingsNavGroup[] = [];
  let current: SettingsNavGroup | null = null;

  for (const e of SETTINGS_NAV_STRUCTURE) {
    if (e.kind === "group") {
      if (current?.items.length) groups.push(current);
      current = { label: e.label, items: [] };
      continue;
    }
    if (e.id === SETTINGS_NAV_OVERVIEW_ID) continue;
    if (!current) current = { label: "Altro", items: [] };
    current.items.push({ id: e.id, label: e.label });
  }
  if (current?.items.length) groups.push(current);
  return groups;
}

export function settingsSectionLabel(sectionId: SistemaSectionId): string {
  const entry = SETTINGS_NAV_STRUCTURE.find(
    (e): e is Extract<(typeof SETTINGS_NAV_STRUCTURE)[number], { kind: "item" }> =>
      e.kind === "item" && e.id === sectionId,
  );
  return entry?.label ?? "Sezione";
}

export function settingsDefaultSectionId(pageMode: boolean): SistemaSectionId {
  return pageMode ? SETTINGS_NAV_OVERVIEW_ID : "brand-personalizzazione";
}

/** Query param pagina `/impostazioni` — persiste la sezione al reload. */
export const SETTINGS_SECTION_QUERY_KEY = "sezione";

const VALID_SECTION_IDS = new Set(
  SETTINGS_NAV_STRUCTURE.filter((e): e is Extract<SettingsNavEntry, { kind: "item" }> => e.kind === "item").map(
    (e) => e.id,
  ),
);

export function isSistemaSectionId(value: string): value is SistemaSectionId {
  return VALID_SECTION_IDS.has(value as SistemaSectionId);
}

export function parseSettingsSectionFromSearchParam(
  raw: string | null | undefined,
): SistemaSectionId | null {
  const trimmed = raw?.trim();
  if (!trimmed || !isSistemaSectionId(trimmed)) return null;
  return trimmed;
}

/** Path canonico per deep-link / reload (Panoramica = `/impostazioni` senza query). */
export function impostazioniPathForSection(sectionId: SistemaSectionId): string {
  if (sectionId === SETTINGS_NAV_OVERVIEW_ID) return "/impostazioni";
  return `/impostazioni?${SETTINGS_SECTION_QUERY_KEY}=${encodeURIComponent(sectionId)}`;
}
