/**
 * Visual Layout Linter — integration policy tests (no jsdom).
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { detectCrossInstanceDrift, dedupeIssues } from "@/lib/ui-visual-linter/layout-diff-engine";
import { shouldSkipElement, VISUAL_LAYOUT_ALLOWLIST } from "@/lib/ui-visual-linter/layout-rules";
import { computeLayoutScore } from "@/lib/ui-visual-linter/layout-score";
import {
  extractToolbarSignatureFromStyles,
  type ToolbarSignature,
} from "@/lib/ui-visual-linter/layout-signature";
import {
  runVisualLayoutLinter,
  LAYOUT_LINTER_LOG_PREFIX,
} from "@/lib/ui-visual-linter/visual-layout-linter";

const ROOT = process.cwd();

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

// SSR-safe: null root
const ssrResult = runVisualLayoutLinter(null, "/test");
assert.equal(ssrResult.issues.length, 0);
assert.equal(ssrResult.signatureCount, 0);

// Allowlist class tokens
assert.ok(VISUAL_LAYOUT_ALLOWLIST.classTokens.includes("globalTableWrap"));
assert.ok(VISUAL_LAYOUT_ALLOWLIST.classTokens.includes("lavorazioni-kanban"));

const fakeKanban = { className: "lavorazioni-kanban-column", matches: () => false, closest: () => null } as unknown as HTMLElement;
assert.equal(shouldSkipElement(fakeKanban, "/lavorazioni"), true);
assert.equal(shouldSkipElement(fakeKanban, "/lavorazioni:kanban"), true);

const fakeTableWrap = { className: "globalTableWrap overflow-x-auto", matches: () => false, closest: () => null } as unknown as HTMLElement;
assert.equal(shouldSkipElement(fakeTableWrap, "/magazzino"), true);

// Cross-instance toolbar gap drift
const toolbarA: ToolbarSignature = {
  type: "toolbar",
  target: "a",
  gapPx: 8,
  layout: "row",
  alignItems: "center",
  searchFlexGrow: 1,
  actionsShrink: true,
  wrapPolicy: "none",
};
const toolbarB: ToolbarSignature = {
  ...toolbarA,
  target: "b",
  gapPx: 16,
};
const driftIssues = detectCrossInstanceDrift([toolbarA, toolbarB], "/lavorazioni");
assert.ok(driftIssues.some((i) => i.message.includes("toolbar gap inconsistency")));

// Dedupe
const duped = dedupeIssues(
  [
    { rule: "toolbar-gap", severity: "warning", message: "x", target: "a", category: "toolbar" },
    { rule: "toolbar-gap", severity: "warning", message: "x", target: "a", category: "toolbar" },
  ],
  "/test",
);
assert.equal(duped.length, 1);

// Stable issue keys
const keys = driftIssues.map((i) => `${i.rule}::${i.target}`);
assert.ok(keys.every((k) => typeof k === "string" && k.length > 0));

// Score stable on fixture
const score = computeLayoutScore(driftIssues);
assert.ok(score.overall >= 0 && score.overall <= 100);

// Module files exist
const coreFiles = [
  "lib/ui-visual-linter/visual-layout-linter.ts",
  "lib/ui-visual-linter/layout-signature.ts",
  "lib/ui-visual-linter/layout-rules.ts",
  "lib/ui-visual-linter/layout-diff-engine.ts",
  "lib/ui-visual-linter/layout-score.ts",
  "lib/ui-visual-linter/use-visual-layout-linter.ts",
  "components/gestionale/visual-layout-linter-mount.tsx",
];
for (const f of coreFiles) {
  assert.ok(fs.existsSync(path.join(ROOT, f)), `missing ${f}`);
}

const appShell = read("components/gestionale/app-shell.tsx");
assert.match(appShell, /DevAuditMounts/);
assert.match(read("components/gestionale/dev-audit-mounts.tsx"), /VisualLayoutLinterMount/);

const mount = read("components/gestionale/visual-layout-linter-mount.tsx");
assert.match(mount, /NODE_ENV !== "development"/);
assert.match(mount, /runVisualLayoutLinterFromMain/);

assert.match(read("lib/ui-visual-linter/visual-layout-linter.ts"), new RegExp(LAYOUT_LINTER_LOG_PREFIX.replace("[", "\\[")));

// Gap drift detection via styles
const rowStyle = {
  display: "flex",
  flexDirection: "row",
  gap: "16px",
  alignItems: "center",
  justifyContent: "flex-start",
  flexWrap: "nowrap",
  flexGrow: "0",
  flexShrink: "1",
  minWidth: "auto",
  paddingTop: "0",
  paddingBottom: "0",
  paddingLeft: "0",
  paddingRight: "0",
  height: "auto",
  position: "static",
};
const sig = extractToolbarSignatureFromStyles(
  "div.toolbar",
  rowStyle,
  "gap-4",
  { flexGrow: "1", flexShrink: "1", minWidth: "0", display: "block", flexDirection: "row", gap: "0", alignItems: "stretch", justifyContent: "flex-start", flexWrap: "nowrap", paddingTop: "0", paddingBottom: "0", paddingLeft: "0", paddingRight: "0", height: "auto", position: "static" },
  { flexGrow: "0", flexShrink: "0", minWidth: "auto", display: "flex", flexDirection: "row", gap: "0", alignItems: "center", justifyContent: "flex-start", flexWrap: "nowrap", paddingTop: "0", paddingBottom: "0", paddingLeft: "0", paddingRight: "0", height: "auto", position: "static" },
);
assert.equal(sig.gapPx, 16);

console.log("visual-layout-linter.test.ts OK");
