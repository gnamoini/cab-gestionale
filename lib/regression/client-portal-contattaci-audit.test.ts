/**
 * Audit statico: modal Contattaci Portale Clienti — link nativi, no duplicazioni header.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

const contact = read("lib/lavorazioni/client-portal-contact.ts");
const dialog = read("components/lavorazioni-clienti/client-contattaci-dialog.tsx");

assert.match(contact, /telHref:\s*"tel:\+393480712791"/);
assert.match(contact, /mailtoHref:\s*"mailto:service@autocompattatori\.it"/);
assert.match(contact, /whatsappHref:\s*"https:\/\/wa\.me\/393480712791"/);

assert.match(dialog, /ClientContattaciModalHeader/);
assert.doesNotMatch(dialog, /CloseButton/);
assert.doesNotMatch(dialog, /dsModalCloseBtn/);
assert.match(dialog, /titleId=\{CONTATTACI_TITLE_ID\}/);
assert.match(dialog, /header=\{<ClientContattaciModalHeader/);

for (const testId of ["smoke-contattaci-call", "smoke-contattaci-whatsapp", "smoke-contattaci-email"]) {
  assert.match(dialog, new RegExp(`data-testid="${testId}"`));
}

const actionAnchors = dialog.match(/<a[\s\S]*?data-testid="smoke-contattaci-(call|whatsapp|email)"[\s\S]*?>/g) ?? [];
assert.equal(actionAnchors.length, 3, "expected exactly 3 action anchors in footer");
for (const block of actionAnchors) {
  assert.doesNotMatch(block, /onClick=/, "contact actions must use native href only");
}

assert.match(dialog, /href=\{telHref\}/);
assert.match(dialog, /href=\{whatsappHref\}/);
assert.match(dialog, /href=\{mailtoHref\}/);
assert.match(dialog, /target="_blank"/);
assert.match(dialog, /rel="noopener noreferrer"/);

assert.match(dialog, /data-testid="smoke-contattaci-close"/);

const scrollBodyMatch = dialog.match(/<GestionaleModalScrollBody[\s\S]*?<\/GestionaleModalScrollBody>/);
assert.ok(scrollBodyMatch, "GestionaleModalScrollBody block expected");
const scrollBody = scrollBodyMatch[0]!;
assert.doesNotMatch(scrollBody, /<a\s+href=/, "scroll body must not contain action links");

console.log("client-portal-contattaci-audit.test.ts OK");
