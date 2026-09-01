/**
 * PWA render audit — gate, probe page, diagnostics export policy.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
function read(rel: string) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

const gate = read("lib/observability/pwa-render-audit-gate.ts");
assert.match(gate, /NEXT_PUBLIC_PWA_RENDER_AUDIT === "1"/);
assert.doesNotMatch(gate, /from ["']@\/lib\/observability\/pwa-render-diagnostics["']/);

const diagnostics = read("lib/observability/pwa-render-diagnostics.ts");
assert.match(diagnostics, /export function collectPwaRenderSnapshot/);
assert.match(diagnostics, /export async function collectPwaRenderCacheParity/);
assert.match(diagnostics, /sha256Prefix/);
assert.match(diagnostics, /__cabPwaRenderAudit/);
assert.match(diagnostics, /isPwaRenderAuditEnabled/);

const bridge = read("src/components/pwa-render-audit-bridge.tsx");
assert.match(bridge, /isPwaRenderAuditEnabled/);
assert.match(bridge, /initPwaRenderDiagnostics/);

const pack = read("components/observability/observability-diagnostics-pack-inner.tsx");
assert.match(pack, /PwaRenderAuditBridge/);

const probePage = read("app/(gestionale)/sicurezza/pwa-render-probe/page.tsx");
assert.match(probePage, /isPwaRenderAuditEnabled/);
assert.match(probePage, /PwaRenderProbePanel/);

const probePanel = read("components/ops/pwa-render-probe-panel.tsx");
const requiredProbeIds = [
  "toolbar-blur",
  "toast-glass",
  "modal-blur",
  "svg-bar-gradient",
  "svg-line-glow",
  "opacity-transform",
  "clip-opacity",
  "mask-gradient",
  "radial-gradient",
  "pulse-skeleton",
  "svg-plain",
  "html-solid",
];
for (const id of requiredProbeIds) {
  assert.match(probePanel, new RegExp(`data-probe-id="${id}"`));
}

const report = read("docs/investigation/pwa-windows-render-audit.md");
assert.match(report, /H1/);
assert.match(report, /__cabPwaRenderCacheParity/);
assert.match(report, /T7/);

console.log("pwa-render-audit-policy.test.ts OK");
