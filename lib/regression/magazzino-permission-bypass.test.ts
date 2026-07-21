import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const movimentiEntry = fs.readFileSync(path.join(ROOT, "lib/domain/movimenti-entry.ts"), "utf8");
const settingsEntry = fs.readFileSync(path.join(ROOT, "lib/domain/settings-entry.ts"), "utf8");
const magazzinoView = fs.readFileSync(path.join(ROOT, "components/gestionale/magazzino/magazzino-view.tsx"), "utf8");

assert.match(movimentiEntry, /withPageWriteGuard\("magazzino"/);
assert.match(movimentiEntry, /storno/);
assert.match(movimentiEntry, /Eliminazione movimento non consentita/);
assert.match(settingsEntry, /upsertMagazzinoSetting/);
assert.match(settingsEntry, /withPageWriteGuard\("magazzino"/);
assert.match(magazzinoView, /useMagazzinoSettingsUpsertMutation/);

console.log("magazzino-permission-bypass.test.ts OK");
