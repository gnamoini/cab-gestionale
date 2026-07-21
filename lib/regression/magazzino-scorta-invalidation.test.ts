import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const hook = fs.readFileSync(
  path.join(ROOT, "src/hooks/gestionale/use-stock-adjust-mutation.ts"),
  "utf8",
);
const view = fs.readFileSync(
  path.join(ROOT, "components/gestionale/magazzino/magazzino-view.tsx"),
  "utf8",
);

assert.match(hook, /runStockAdjustPipeline/);
assert.match(hook, /useDeterministicStockPipeline/);
assert.match(hook, /useEmergencyLegacyStockAdjustMutation/);
assert.doesNotMatch(view, /optimisticQuantita/);
assert.match(view, /hydrateJournalFromSession/);
assert.match(view, /MagazzinoScortaDisplayBadge/);

console.log("magazzino-scorta-invalidation.test.ts OK");
