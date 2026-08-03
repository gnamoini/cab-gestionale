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
assert.match(mobileCardsBlock, /label="Completamento"/);
assert.match(mobileCardsBlock, /LavorazioneCompletamentoDatePill/);
assert.match(mobileCardsBlock, /LavorazioneMobileControlsPanel/);
assert.match(mobileCardsBlock, /ariaLabel=\{variant === "archive" \? "Completamento e addetto" : "Stato e addetto"\}/);
assert.doesNotMatch(mobileCardsBlock, /secondaryDate/);

const controlsPanelBlock = mobileCard.slice(
  mobileCard.indexOf("export function LavorazioneMobileControlsPanel"),
  mobileCard.indexOf("/** Footer card mobile"),
);
assert.doesNotMatch(controlsPanelBlock, /cab-shell-desktop:grid-cols-2/);
assert.match(controlsPanelBlock, /grid-cols-1/);
assert.match(read("components/gestionale/lavorazioni/lavorazioni-table-shared.tsx"), /lavMobilePillWidthClass/);

const headerBlock = mobileCard.slice(
  mobileCard.indexOf("export function LavorazioneMobileCardHeader"),
  mobileCard.indexOf("/** Riga mobile: etichetta + controllo"),
);
assert.match(
  headerBlock,
  /identificazioneFields = \[[\s\S]*label: "Scuderia"[\s\S]*label: "Targa"[\s\S]*label: "Matricola"/,
);

assert.match(mobileCard, /ariaLabel = "Stato, priorità e addetto"/);

console.log("client-portal-mobile-cards-audit.test.ts OK");
