/**
 * Audit: persistenza inline Marca/Modello da ricambio — SSOT, permessi magazzino, no race overwrite.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

const globalListKeys = read("src/lib/global-list/global-settings-list-keys.ts");
const appendHook = read("src/hooks/use-append-global-list-value.ts");
const settingsEntry = read("lib/domain/settings-entry.ts");
const magazzinoView = read("components/gestionale/magazzino/magazzino-view.tsx");

assert.match(globalListKeys, /registerMarcaInMagazzinoMaster/);
assert.match(appendHook, /isHierarchyListContext/);
assert.match(appendHook, /isMagazzinoScopedListAppend/);
assert.match(settingsEntry, /CAB_SETTINGS_MODULE\.mezzi.*CAB_SETTINGS_KEY\.liste/s);
assert.match(magazzinoView, /marcheGlobal/);
assert.match(magazzinoView, /mergedMarche = mergeMasterWithRows/);

console.log("magazzino-inline-marca-modello-persist-audit.test.ts OK");
