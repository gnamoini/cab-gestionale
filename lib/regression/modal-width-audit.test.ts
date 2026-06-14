/**
 * Audit larghezze modali: tier standard unico (SSOT), niente max-w ad hoc sulle shell.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

function listTsxUnder(dir: string): string[] {
  const out: string[] = [];
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) out.push(...listTsxUnder(full));
    else if (ent.name.endsWith(".tsx")) out.push(full);
  }
  return out;
}

const ssot = read("lib/ui/modal-size-system.ts");
assert.match(ssot, /resolveModalWidthClasses/);
assert.match(ssot, /formMedium/);
assert.match(ssot, /confirmation/);
assert.match(ssot, /resolveDrawerAsideClasses/);
assert.match(ssot, /cab-log-drawer-panel/);

const reExport = read("lib/ui/modal-max-width-class.ts");
assert.match(reExport, /gestionaleModalWidthConfirmation/);
assert.match(reExport, /modal-size-system/);

const componentsDir = path.join(ROOT, "components");
for (const file of listTsxUnder(componentsDir)) {
  const rel = path.relative(ROOT, file).replace(/\\/g, "/");
  if (rel === "components/gestionale/lavorazioni/lavorazioni-modals.tsx") continue;
  const src = fs.readFileSync(file, "utf8");
  if (!/<(?:Lavorazioni|Gestionale)ModalShell\b/.test(src)) continue;

  assert.doesNotMatch(
    src,
    /maxWidthClass\s*=/,
    `${rel}: usare size="standard"|"wide" invece di maxWidthClass`,
  );

  const shellBlocks = src.match(/<(?:Lavorazioni|Gestionale)ModalShell[\s\S]*?>/g) ?? [];
  for (const block of shellBlocks) {
    assert.doesNotMatch(
      block,
      /\swide(?:\s|>|={)/,
      `${rel}: prop wide deprecata`,
    );
    assert.doesNotMatch(
      block,
      /size=["']wide["']/,
      `${rel}: tier wide deprecato — usare modalSize`,
    );
    assert.doesNotMatch(
      block,
      /size=["']standard["']/,
      `${rel}: usare modalSize invece di size="standard"`,
    );
    assert.doesNotMatch(
      block,
      /dialogSize=/,
      `${rel}: usare modalSize/modalHeight invece di dialogSize`,
    );
    assert.doesNotMatch(
      block,
      /max-w-(lg|md|xl|3xl|4xl|5xl|6xl|7xl)/,
      `${rel}: larghezza modale solo via modalSize (SSOT)`,
    );
  }
}

console.log("modal-width-audit.test.ts OK");
