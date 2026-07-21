import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

const writers = [
  { file: "app/api/magazzino/stock/adjust/route.ts", must: ["stockApplyMovement"] },
  { file: "lib/magazzino/stock-engine.server.ts", must: ["stock_apply_movement", "adjustStock"] },
  { file: "lib/data-import/entities/magazzino/magazzino-import-execute.server.ts", must: ["stockApplyMovement"] },
  { file: "lib/magazzino/movimenti-stock-pipeline.ts", must: ["stockAdjustFetch"] },
  { file: "lib/magazzino/stock-pipeline-execute.ts", must: ["stockAdjustFetch", "enqueueStockMutation"] },
];

for (const w of writers) {
  const content = fs.readFileSync(path.join(ROOT, w.file), "utf8");
  for (const token of w.must) {
    assert.match(content, new RegExp(token), `${w.file} must reference ${token}`);
  }
}

const movimenti = fs.readFileSync(path.join(ROOT, "src/services/movimenti.service.ts"), "utf8");
assert.match(movimenti, /shouldUseStockPipelineForMovimenti/);
assert.match(movimenti, /applyStockViaPipelineApi/);

const legacyDirect = fs.readFileSync(path.join(ROOT, "src/services/movimenti.service.ts"), "utf8");
assert.match(legacyDirect, /applyStockForMovement/);

console.log("stock-writer-matrix.test.ts OK");
