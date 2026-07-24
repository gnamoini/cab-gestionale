/**
 * Audit statico: superfici di visualizzazione Scheda Ingresso e componenti collegati.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

const panoramica = read("components/gestionale/lavorazioni/scheda-ingresso-panoramica-view.tsx");
const hub = read("components/lavorazioni/schede/schede-lavorazione-modal.tsx");
const lavorazioniView = read("components/gestionale/lavorazioni/lavorazioni-view.tsx");
const mobileCards = read("components/gestionale/lavorazioni/lavorazione-mobile-cards.tsx");
const tableRow = read("components/gestionale/lavorazioni/lavorazione-table-row.tsx");
const mobileCard = read("components/gestionale/lavorazioni/lavorazione-mobile-card.tsx");
const kanban = read("components/gestionale/lavorazioni/lavorazioni-kanban-view.tsx");
const clientDialog = read("components/lavorazioni-clienti/client-lavorazione-ingresso-dialog.tsx");
const pdfLayout = read("lib/pdf/ingresso-pdf-layout.ts");
const displayHelpers = read("lib/lavorazioni/lavorazione-display-helpers.ts");

const SCHEDA_FIELDS = [
  "dataIngresso",
  "cliente",
  "cantiere",
  "utilizzatore",
  "richiedente",
  "richiedenteTelefono",
  "tipoAttrezzatura",
  "marcaAttrezzatura",
  "modelloAttrezzatura",
  "matricola",
  "nScuderia",
  "oreLavoro",
  "tipoTelaio",
  "marcaTelaio",
  "modelloTelaio",
  "targa",
  "km",
  "livelloCarburante",
  "descrizioneAnomalia",
  "addettoAccettazione",
] as const;

for (const key of SCHEDA_FIELDS) {
  assert.match(panoramica, new RegExp(`fields\\.${key}`), `panoramica must show fields.${key}`);
}

assert.match(panoramica, /whitespace-pre-wrap/, "panoramica multiline fields use pre-wrap");
assert.match(panoramica, /multilineValue\(fields\.descrizioneAnomalia\)/);
assert.match(panoramica, /multilineValue\(lavorazioneNote \?\? ""\)/);

assert.match(clientDialog, /SchedaIngressoPanoramicaView/);
assert.match(clientDialog, /lavorazioneNote=/);
assert.match(hub, /SchedaIngressoPanoramicaAnagraficaContent/);

assert.match(tableRow, /resolveLavorazioneNote/);
assert.match(mobileCards, /resolveLavorazioneNote/);
assert.match(tableRow, /line-clamp-2/);
assert.match(mobileCard, /LavorazioneMobileNote/);
assert.match(kanban, /resolveLavorazioneNote/);
assert.doesNotMatch(lavorazioniView, /lavorazioneNoteOperative/);
assert.doesNotMatch(displayHelpers, /noteIntervento/);
assert.match(displayHelpers, /resolveLavorazioneNote/);

assert.match(displayHelpers, /resolveLavorazioneNote/, "note column uses lavorazioni.note SSOT");
assert.doesNotMatch(displayHelpers, /descrizioneAnomalia/);

assert.match(pdfLayout, /multiline: true/);
assert.match(pdfLayout, /descrizioneAnomalia/);
assert.match(pdfLayout, /lavorazioneNote/);

console.log("scheda-ingresso-display-audit.test.ts OK");
