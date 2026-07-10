export const COLLAPSIBLE_PREFS_KEY_PREFIX = "gestionale-collapse-prefs:v1";

export const COLLAPSIBLE_PREFS_VERSION = 1 as const;

/** Valore serializzabile per una sezione collapsible. */
export type CollapsiblePrefValue = boolean | string | number | string[];

export type CollapsiblePrefsBlob = {
  v: typeof COLLAPSIBLE_PREFS_VERSION;
  sections: Record<string, CollapsiblePrefValue>;
};

export const EMPTY_COLLAPSIBLE_PREFS_BLOB: CollapsiblePrefsBlob = {
  v: COLLAPSIBLE_PREFS_VERSION,
  sections: {},
};

/** Legacy localStorage — documenti tree bulk pref. */
export const LEGACY_DOCUMENTI_TREE_PREF_KEY = "cab-documenti-tree-pref";

/** Legacy sessionStorage — kanban mobile open section. */
export const LEGACY_KANBAN_OPEN_SECTION_KEY = "lavorazioni-kanban-mobile-open-section";

/** Marker one-shot: espandi tutte le marche al primo catalog load post-migrazione. */
export const COLLAPSIBLE_LEGACY_EXPAND_ALL_KEY = "__legacyExpandAll";

/** Chiave sezione kanban mobile nello scope lavorazioni. */
export const COLLAPSIBLE_KANBAN_OPEN_KEY = "kanban-open";
