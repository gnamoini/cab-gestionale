/**
 * Audit UX modali portale clienti — allineamento pattern ricambio (footer shell, scroll body, token cab).
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

const files = [
  "components/lavorazioni-clienti/client-contattaci-dialog.tsx",
  "components/lavorazioni-clienti/client-lavorazione-qr-dialog.tsx",
  "components/lavorazioni-clienti/client-lavorazione-ingresso-dialog.tsx",
  "components/lavorazioni-clienti/client-lavorazione-documents.tsx",
  "components/lavorazioni-clienti/client-lavorazione-photos.tsx",
];

for (const rel of files) {
  const src = read(rel);
  assert.match(src, /LavorazioniModalShell|SchedaIngressoFormModalShell/, `${rel}: shell SSOT expected`);
  assert.doesNotMatch(
    src,
    /<footer className=\{\`\$\{dsModalFormFooter\}/,
    `${rel}: footer must use shell footer prop, not inline dsModalFormFooter`,
  );
  assert.doesNotMatch(
    src,
    /border-zinc-200 bg-white/,
    `${rel}: no zinc legacy footer blocks`,
  );
}

const contattaci = read("components/lavorazioni-clienti/client-contattaci-dialog.tsx");
assert.match(contattaci, /footer=\{/);
assert.match(contattaci, /min-h-11/);

const qr = read("components/lavorazioni-clienti/client-lavorazione-qr-dialog.tsx");
assert.match(qr, /GestionaleModalScrollBody/);
assert.match(qr, /footer=\{/);
assert.match(qr, /border-\[color:var\(--cab-border\)\]/);
assert.doesNotMatch(qr, /border-zinc-200/);

const ingresso = read("components/lavorazioni-clienti/client-lavorazione-ingresso-dialog.tsx");
assert.match(ingresso, /GestionaleModalScrollBody/);
assert.doesNotMatch(ingresso, /footer=\{/);
assert.doesNotMatch(ingresso, />\s*Chiudi\s*</);
assert.doesNotMatch(ingresso, /border-zinc-200 bg-zinc-50/);
assert.doesNotMatch(ingresso, /officina/i);
assert.doesNotMatch(ingresso, /file_esterno/);

const documents = read("components/lavorazioni-clienti/client-lavorazione-documents.tsx");
assert.match(documents, /GestionaleModalScrollBody/);
assert.doesNotMatch(documents, /ClientLavorazioneDocumentsDialog[\s\S]*footer=\{/);

const photos = read("components/lavorazioni-clienti/client-lavorazione-photos.tsx");
assert.match(photos, /GestionaleModalScrollBody/);

console.log("client-portal-modal-ux-audit.test.ts OK");
