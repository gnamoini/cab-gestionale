/**
 * Visual clip remediation — static policy guards (paint clip-margin + toolbar blur isolation).
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

function read(rel: string) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

const globalsCoreCss = read("app/globals-core.css");
const globalsShellCss = read("app/globals-gestionale-shell.css");
const designSystem = read("lib/ui/design-system.ts");
const shellCard = read("components/gestionale/shell-card.tsx");
const responsiveCore = read("lib/ui/responsive-layout-core.ts");

assert.match(globalsCoreCss, /--cab-paint-clip-margin:\s*12px/);

assert.match(
  globalsShellCss,
  /\.cab-gestionale-scroll-gutter-mirror[\s\S]*overflow:\s*hidden[\s\S]*overflow-clip-margin:\s*var\(--cab-paint-clip-margin\)/,
);

assert.match(
  globalsShellCss,
  /\.gestionale-scroll-y[\s\S]*overflow-x:\s*hidden[\s\S]*overflow-clip-margin:\s*var\(--cab-paint-clip-margin\)/,
);

assert.match(
  globalsShellCss,
  /\.cab-layout-page-stack[\s\S]*overflow-x:\s*clip[\s\S]*overflow-clip-margin:\s*var\(--cab-paint-clip-margin\)/,
);

assert.match(
  globalsShellCss,
  /\.cab-shell-card[\s\S]*overflow:\s*hidden[\s\S]*overflow-clip-margin:\s*var\(--cab-paint-clip-margin\)/,
);

assert.match(globalsShellCss, /\.cab-page-toolbar-surface[\s\S]*::before[\s\S]*backdrop-filter:\s*blur/);

assert.match(responsiveCore, /cab-layout-page-stack/);
assert.doesNotMatch(responsiveCore, /overflow-x-clip/);

assert.match(shellCard, /cab-shell-card/);
assert.doesNotMatch(shellCard, /overflow-hidden \$\{className\}/);

assert.match(designSystem, /cab-page-toolbar-surface/);
assert.doesNotMatch(designSystem, /dsPageToolbar = `[^`]*backdrop-blur-md/);

console.log("visual-clip-remediation-policy.test.ts OK");
