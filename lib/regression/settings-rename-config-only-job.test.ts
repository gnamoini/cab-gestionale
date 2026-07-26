import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const shell = fs.readFileSync(
  path.join(process.cwd(), "components/dashboard/settings/settings-workspace-shell.tsx"),
  "utf8",
);
const engine = fs.readFileSync(path.join(process.cwd(), "src/services/settings-rename-engine.service.ts"), "utf8");

assert.match(shell, /settingsRenameEngineEntry/);
assert.match(shell, /configuration_only/);
assert.match(shell, /propagaImpacts/);
assert.match(engine, /configurationOnlyHealth/);

console.log("settings-rename-config-only-job.test.ts OK");
