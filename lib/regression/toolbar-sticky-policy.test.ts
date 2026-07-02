/**
 * Policy: toolbar/search wrapper nelle view non devono usare sticky top-* ad hoc.
 * Usare PageToolbar (liste) o dsPageToolbar da design-system.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

const SCAN_DIRS = [
  "components/gestionale",
  "components/dashboard",
  "components/preventivi",
  "components/lavorazioni-clienti",
];

const ALLOWLIST_SUBSTR = [
  "global-table",
  "gestionale-list-table.css",
  "lavorazioni-scroll.css",
  "app-shell.tsx",
  "supabase-configuration-banner",
  "preventivi-editor-modal",
  "sistema-impostazioni-modal",
  "report-magazzino-section",
];

const FORBIDDEN = /\bsticky\s+top-/;

function walk(dir: string, out: string[]): void {
  if (!fs.existsSync(dir)) return;
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const st = fs.statSync(full);
    if (st.isDirectory()) {
      if (name === "node_modules") continue;
      walk(full, out);
      continue;
    }
    if (!/\.(tsx|ts|css)$/.test(name)) continue;
    if (ALLOWLIST_SUBSTR.some((s) => full.replace(/\\/g, "/").includes(s))) continue;
    out.push(full);
  }
}

function main(): void {
  const files: string[] = [];
  for (const rel of SCAN_DIRS) {
    walk(path.join(ROOT, rel), files);
  }

  const violations: string[] = [];
  for (const file of files) {
    const rel = path.relative(ROOT, file).replace(/\\/g, "/");
    if (!/-view\.tsx$/.test(rel) && !rel.endsWith("security-users-permissions-panel.tsx")) continue;
    const src = fs.readFileSync(file, "utf8");
    if (FORBIDDEN.test(src)) {
      violations.push(rel);
    }
    if (rel.includes("security-users-permissions-panel") && /\bdsStickyToolbar\b/.test(src)) {
      violations.push(`${rel} (must use dsPageToolbar, not dsStickyToolbar)`);
    }
  }

  assert.equal(
    violations.length,
    0,
    `Toolbar sticky policy violations:\n${violations.map((v) => `  - ${v}`).join("\n")}`,
  );

  const ds = fs.readFileSync(path.join(ROOT, "lib/ui/design-system.ts"), "utf8");
  assert.ok(ds.includes("export const dsPageToolbar"), "dsPageToolbar token missing");
  assert.doesNotMatch(ds, /dsStickyToolbar = `\$\{dsPageToolbar\} sticky top-0/);

  const toolbarGroup = fs.readFileSync(
    path.join(ROOT, "components/design-system/toolbar-group.tsx"),
    "utf8",
  );
  assert.doesNotMatch(toolbarGroup, /\bsticky\s+top-/);
  assert.match(toolbarGroup, /dsPageToolbar/);

  const pageToolbar = fs.readFileSync(
    path.join(ROOT, "components/design-system/page-toolbar.tsx"),
    "utf8",
  );
  assert.doesNotMatch(pageToolbar, /\bsticky\s*[=:]/);

  console.log("toolbar-sticky-policy.test.ts OK");
}

main();
