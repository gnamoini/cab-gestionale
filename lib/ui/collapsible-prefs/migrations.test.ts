import assert from "node:assert/strict";
import {
  migrateDocumentiLegacyPrefs,
  migrateLavorazioniKanbanLegacyPrefs,
} from "@/lib/ui/collapsible-prefs/migrations";
import {
  COLLAPSIBLE_KANBAN_OPEN_KEY,
  COLLAPSIBLE_LEGACY_EXPAND_ALL_KEY,
  EMPTY_COLLAPSIBLE_PREFS_BLOB,
  LEGACY_DOCUMENTI_TREE_PREF_KEY,
  LEGACY_KANBAN_OPEN_SECTION_KEY,
} from "@/lib/ui/collapsible-prefs/types";

const memory = new Map<string, string>();
const g = globalThis as typeof globalThis & { localStorage?: Storage; sessionStorage?: Storage };

g.localStorage = {
  getItem: (k) => memory.get(k) ?? null,
  setItem: (k, v) => memory.set(k, v),
  removeItem: (k) => memory.delete(k),
  clear: () => memory.clear(),
  key: () => null,
  get length() {
    return memory.size;
  },
};

g.sessionStorage = {
  getItem: (k) => memory.get(`ss:${k}`) ?? null,
  setItem: (k, v) => memory.set(`ss:${k}`, v),
  removeItem: (k) => memory.delete(`ss:${k}`),
  clear: () => memory.clear(),
  key: () => null,
  get length() {
    return memory.size;
  },
};

memory.clear();
memory.set(LEGACY_DOCUMENTI_TREE_PREF_KEY, "collapsed");
const collapsed = migrateDocumentiLegacyPrefs(EMPTY_COLLAPSIBLE_PREFS_BLOB);
assert.deepEqual(collapsed.sections.tree, []);
assert.equal(memory.has(LEGACY_DOCUMENTI_TREE_PREF_KEY), false);

memory.set(LEGACY_DOCUMENTI_TREE_PREF_KEY, "expanded");
const expanded = migrateDocumentiLegacyPrefs(EMPTY_COLLAPSIBLE_PREFS_BLOB);
assert.equal(expanded.sections[COLLAPSIBLE_LEGACY_EXPAND_ALL_KEY], true);

memory.set(`ss:${LEGACY_KANBAN_OPEN_SECTION_KEY}`, "stato-1");
const kanban = migrateLavorazioniKanbanLegacyPrefs(EMPTY_COLLAPSIBLE_PREFS_BLOB);
assert.equal(kanban.sections[COLLAPSIBLE_KANBAN_OPEN_KEY], "stato-1");
assert.equal(memory.has(`ss:${LEGACY_KANBAN_OPEN_SECTION_KEY}`), false);

console.log("collapsible-prefs/migrations.test.ts OK");
