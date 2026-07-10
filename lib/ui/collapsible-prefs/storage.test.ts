import assert from "node:assert/strict";
import {
  collapsiblePrefsStorageKey,
  read,
  readSection,
  write,
  writeSection,
} from "@/lib/ui/collapsible-prefs/storage";
import {
  COLLAPSIBLE_PREFS_KEY_PREFIX,
  LEGACY_DOCUMENTI_TREE_PREF_KEY,
} from "@/lib/ui/collapsible-prefs/types";

const memory = new Map<string, string>();

const g = globalThis as typeof globalThis & {
  localStorage?: Storage;
  window?: Window & typeof globalThis;
};

const originalLocalStorage = g.localStorage;

function installMockStorage(): void {
  const store = memory;
  const mock: Storage = {
    get length() {
      return store.size;
    },
    clear() {
      store.clear();
    },
    getItem(key: string) {
      return store.has(key) ? store.get(key)! : null;
    },
    key(index: number) {
      return [...store.keys()][index] ?? null;
    },
    removeItem(key: string) {
      store.delete(key);
    },
    setItem(key: string, value: string) {
      store.set(key, value);
    },
  };
  g.localStorage = mock;
  g.window = g.window ?? (g as Window & typeof globalThis);
  if (!g.window.localStorage) {
    Object.defineProperty(g.window, "localStorage", { value: mock, configurable: true });
  }
}

function restoreStorage(): void {
  if (originalLocalStorage) g.localStorage = originalLocalStorage;
  else Reflect.deleteProperty(g, "localStorage");
}

installMockStorage();
memory.clear();

const userA = "user-a";
const userB = "user-b";
const scope = "dashboard";

assert.equal(collapsiblePrefsStorageKey(userA, scope), `${COLLAPSIBLE_PREFS_KEY_PREFIX}:${userA}:${scope}`);

const empty = read(userA, scope);
assert.equal(empty.v, 1);
assert.deepEqual(empty.sections, {});

writeSection(userA, scope, "widget-a", true, (v) => v);
const blob = read(userA, scope);
assert.equal(blob.sections["widget-a"], true);

writeSection(userA, scope, "widget-b", false, (v) => v);
const merged = read(userA, scope);
assert.equal(merged.sections["widget-a"], true);
assert.equal(merged.sections["widget-b"], false);

assert.equal(readSection(userB, scope, "widget-a", false, (raw, fb) => (typeof raw === "boolean" ? raw : fb)), false);

write(userA, "documenti", { tree: ["m1", "m2"] });
assert.deepEqual(read(userA, "documenti").sections.tree, ["m1", "m2"]);

memory.set(LEGACY_DOCUMENTI_TREE_PREF_KEY, "collapsed");
const docBlob = read(userA, "documenti");
assert.deepEqual(docBlob.sections.tree, []);
assert.equal(memory.has(LEGACY_DOCUMENTI_TREE_PREF_KEY), false);

memory.clear();
memory.set(LEGACY_DOCUMENTI_TREE_PREF_KEY, "expanded");
const docExpanded = read(userA, "documenti");
assert.equal(docExpanded.sections.__legacyExpandAll, true);
assert.equal(memory.has(LEGACY_DOCUMENTI_TREE_PREF_KEY), false);

restoreStorage();
console.log("collapsible-prefs/storage.test.ts OK");
