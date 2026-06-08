/**
 * Audit statico: layout card mobile portale clienti (stato in pannello controlli, no statusSlot).
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

const listView = read("components/lavorazioni-clienti/client-lavorazioni-view.tsx");
const mobileCard = read("components/gestionale/lavorazioni/lavorazione-mobile-card.tsx");

const mobileCardsBlock = listView.slice(
  listView.indexOf("function MobileCards"),
  listView.indexOf("function LavorazioniSection"),
);
assert.ok(mobileCardsBlock.length > 0, "MobileCards block expected");

assert.doesNotMatch(mobileCardsBlock, /statusSlot=/);
assert.match(mobileCardsBlock, /label="Stato"/);
assert.match(mobileCardsBlock, /StatoReadOnlyPill/);
assert.match(mobileCardsBlock, /secondaryDate/);
assert.match(mobileCardsBlock, /label: "Completamento"/);
assert.match(mobileCardsBlock, /ariaLabel=\{variant === "archive" \? "Addetto" : "Stato e addetto"\}/);
assert.match(mobileCardsBlock, /className=\{variant === "archive" \? "col-span-2" : undefined\}/);

assert.match(mobileCard, /ariaLabel = "Priorità e addetto"/);
assert.match(mobileCard, /className = ""/);

console.log("client-portal-mobile-cards-audit.test.ts OK");
