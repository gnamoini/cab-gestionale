import {
  COLLAPSIBLE_KANBAN_OPEN_KEY,
  COLLAPSIBLE_LEGACY_EXPAND_ALL_KEY,
  COLLAPSIBLE_PREFS_VERSION,
  LEGACY_DOCUMENTI_TREE_PREF_KEY,
  LEGACY_KANBAN_OPEN_SECTION_KEY,
  type CollapsiblePrefsBlob,
} from "@/lib/ui/collapsible-prefs/types";

function readLegacyDocumentiTreePref(): "collapsed" | "expanded" | null {
  if (typeof globalThis.localStorage === "undefined") return null;
  try {
    const v = globalThis.localStorage.getItem(LEGACY_DOCUMENTI_TREE_PREF_KEY);
    if (v === "collapsed") return "collapsed";
    if (v === "expanded") return "expanded";
  } catch {
    /* ignore */
  }
  return null;
}

function readLegacyKanbanOpenSection(): string | null {
  if (typeof globalThis.sessionStorage === "undefined") return null;
  try {
    const v = globalThis.sessionStorage.getItem(LEGACY_KANBAN_OPEN_SECTION_KEY);
    return v && v.trim() ? v.trim() : null;
  } catch {
    /* ignore */
  }
  return null;
}

/** One-shot: legacy documenti bulk pref → blob scope documenti. */
export function migrateDocumentiLegacyPrefs(blob: CollapsiblePrefsBlob): CollapsiblePrefsBlob {
  const legacy = readLegacyDocumentiTreePref();
  if (!legacy) return blob;

  const sections = { ...blob.sections };
  if (legacy === "collapsed") {
    sections.tree = [];
  } else {
    sections[COLLAPSIBLE_LEGACY_EXPAND_ALL_KEY] = true;
  }

  try {
    globalThis.localStorage.removeItem(LEGACY_DOCUMENTI_TREE_PREF_KEY);
  } catch {
    /* ignore */
  }

  return { v: COLLAPSIBLE_PREFS_VERSION, sections };
}

/** One-shot: legacy kanban sessionStorage → scope lavorazioni. */
export function migrateLavorazioniKanbanLegacyPrefs(blob: CollapsiblePrefsBlob): CollapsiblePrefsBlob {
  const legacy = readLegacyKanbanOpenSection();
  if (!legacy) return blob;

  const sections = { ...blob.sections, [COLLAPSIBLE_KANBAN_OPEN_KEY]: legacy };

  try {
    globalThis.sessionStorage.removeItem(LEGACY_KANBAN_OPEN_SECTION_KEY);
  } catch {
    /* ignore */
  }

  return { v: COLLAPSIBLE_PREFS_VERSION, sections };
}

export function runScopeMigrations(scope: string, blob: CollapsiblePrefsBlob): CollapsiblePrefsBlob {
  if (scope === "documenti") return migrateDocumentiLegacyPrefs(blob);
  if (scope === "lavorazioni") return migrateLavorazioniKanbanLegacyPrefs(blob);
  return blob;
}
