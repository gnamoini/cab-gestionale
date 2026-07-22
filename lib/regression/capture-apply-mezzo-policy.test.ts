import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function read(rel: string): string {
  return readFileSync(resolve(process.cwd(), rel), "utf8");
}

function run() {
  const compile = read("components/document-capture/capture-scheda-compile-step.tsx");
  assert.match(compile, /applyFromIngressoWithGate/);
  assert.match(compile, /create\.gateSave/);
  assert.match(compile, /writeContext:\s*\{\s*source:\s*"import_ai"/);
  assert.match(compile, /e\.preventDefault\(\)/);

  const applyFlow = read("lib/document-capture/use-capture-apply-flow.ts");
  assert.match(applyFlow, /CaptureApplyMeta/);

  const route = read("app/api/document-capture/[id]/apply/route.ts");
  assert.match(route, /CaptureApplyMeta/);

  const deps = read("lib/document-capture/capture-intervento-write-deps.server.ts");
  assert.match(deps, /recordMezzoAnagraficaHistoryServer/);
  assert.match(deps, /writeContext/);

  console.log("capture-apply-mezzo-policy.test.ts OK");
}

run();
