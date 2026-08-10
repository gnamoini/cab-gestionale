import assert from "node:assert/strict";
import {
  buildMezzoTimelineFeed,
  filterMezzoTimelineFeed,
  type MezzoTimelineFeedInput,
  type MezzoTimelineLavorazioneBlock,
} from "@/lib/mezzi/mezzo-timeline-feed";
import type { MezziHubLogEntry } from "@/lib/mezzi/mezzi-db-ui-adapter";
import type { MezzoInterventoLavorazione } from "@/lib/mezzi/types";
import type { MezzoTimelineItem } from "@/src/services/domain/mezzo-domain.service";
import type { MezzoAnagraficaHistoryRow } from "@/src/services/mezzo-anagrafica-history.service";

const MEZZO_ID = "mezzo-1";
const LAV_A = "lav-a";
const LAV_B = "lav-b";

const interventi: MezzoInterventoLavorazione[] = [
  {
    id: LAV_A,
    origine: "attiva",
    codice: "26-0001",
    dataIngresso: "2026-07-01T08:00:00Z",
    dataCompletamento: "2026-07-05T18:00:00Z",
    durataGiorniLabel: "5 giorni",
    durataGiorniNum: 5,
    tipoIntervento: "Ordinario",
    descrizione: "A",
    prioritaLabel: "Normale",
    statoFinale: "Completata",
  },
  {
    id: LAV_B,
    origine: "attiva",
    codice: "26-0002",
    dataIngresso: "2026-07-03T08:00:00Z",
    dataCompletamento: "2026-07-10T18:00:00Z",
    durataGiorniLabel: "8 giorni",
    durataGiorniNum: 8,
    tipoIntervento: "Ordinario",
    descrizione: "B",
    prioritaLabel: "Normale",
    statoFinale: "Completata",
  },
];

function baseInput(overrides: Partial<MezzoTimelineFeedInput> = {}): MezzoTimelineFeedInput {
  return {
    mezzoId: MEZZO_ID,
    timeline: [],
    logEntries: [],
    anagraficaHistory: [],
    interventi,
    ...overrides,
  };
}

// dedup: hub log + timeline log same id
const logEntry: MezziHubLogEntry = {
  id: "log-dup-1",
  at: "2026-06-01T10:00:00Z",
  tipo: "update",
  mezzo: "Test",
  riepilogo: "UPDATE",
  autore: "Mario",
  changes: [],
};

const timelineLogDup: MezzoTimelineItem = {
  id: "log-log-dup-1",
  kind: "log",
  at: "2026-06-01T10:00:00Z",
  title: "Anagrafica · UPDATE",
};

const feedDedup = buildMezzoTimelineFeed(
  baseInput({
    logEntries: [logEntry],
    timeline: [timelineLogDup],
  }),
);
const dedupEvents = feedDedup.flatMap((i) =>
  i.kind === "lavorazioneBlock" ? i.events : [i.event],
);
assert.equal(
  dedupEvents.filter((e) => e.renderKind === "log_modifiche").length,
  1,
  "duplicate log id deduplicated",
);

// log without lavorazione_id stays standalone
const standaloneLog: MezziHubLogEntry = {
  id: "log-standalone",
  at: "2026-06-02T10:00:00Z",
  tipo: "update",
  mezzo: "Test",
  riepilogo: "UPDATE",
  autore: "Mario",
  changes: [],
};
const feedStandalone = buildMezzoTimelineFeed(baseInput({ logEntries: [standaloneLog] }));
assert.equal(feedStandalone.length, 1);
assert.equal(feedStandalone[0]!.kind, "standalone");

// anagrafica_history with lavorazione_id enters block
const anagraficaInBlock: MezzoAnagraficaHistoryRow = {
  id: "anh-1",
  mezzo_id: MEZZO_ID,
  created_at: "2026-07-02T12:00:00Z",
  origine: "scheda_ingresso",
  lavorazione_id: LAV_A,
  scheda_id: null,
  changed_fields: ["targa"],
  old_values: { targa: "AA111" },
  new_values: { targa: "BB222" },
  user_id: null,
};
const feedAnh = buildMezzoTimelineFeed(baseInput({ anagraficaHistory: [anagraficaInBlock] }));
const blockA = feedAnh.find(
  (i): i is MezzoTimelineLavorazioneBlock =>
    i.kind === "lavorazioneBlock" && i.lavorazioneId === LAV_A,
);
assert.ok(blockA, "anagrafica with lavorazione_id in block");
assert.equal(blockA.eventCount, 1);

// Field-level anagrafica_history deduped when nearby anagrafica log exists
const manualAnh: MezzoAnagraficaHistoryRow = {
  id: "anh-manual",
  mezzo_id: MEZZO_ID,
  created_at: "2026-07-25T18:07:00Z",
  origine: "modifica_manuale",
  lavorazione_id: null,
  scheda_id: null,
  changed_fields: ["marcaTelaio"],
  old_values: { marcaTelaio: "FUSO" },
  new_values: { marcaTelaio: "Mitsubishi" },
  user_id: null,
};
const nearbyLog: MezziHubLogEntry = {
  id: "log-nearby",
  at: "2026-07-25T18:07:10Z",
  tipo: "update",
  mezzo: "Test",
  riepilogo: "UPDATE",
  autore: "Giorgio",
  changes: [{ campo: "Marca telaio", prima: "FUSO", dopo: "Mitsubishi" }],
};
const feedAnhVsLog = buildMezzoTimelineFeed(
  baseInput({ anagraficaHistory: [manualAnh], logEntries: [nearbyLog] }),
);
assert.equal(feedAnhVsLog.length, 1);
assert.equal(feedAnhVsLog[0]!.kind, "standalone");
assert.equal(
  (feedAnhVsLog[0] as { event: { renderKind: string } }).event.renderKind,
  "log_modifiche",
);

// event in temporal range but no ref stays standalone
const ambiguousLog: MezzoTimelineItem = {
  id: "tl-ambiguous",
  kind: "log",
  at: "2026-07-04T12:00:00Z",
  title: "Anagrafica · UPDATE",
};
const feedAmbiguous = buildMezzoTimelineFeed(baseInput({ timeline: [ambiguousLog] }));
assert.equal(feedAmbiguous.length, 1);
assert.equal(feedAmbiguous[0]!.kind, "standalone");

// tagliandi filter keeps only blocks with tagliando category
const tagliandoEvent: MezzoTimelineItem = {
  id: "tag-1",
  kind: "tagliando",
  at: "2026-07-02T15:00:00Z",
  title: "Tagliando · 100%",
  ref: { lavorazioneId: LAV_A, origine: "storico" },
};
const movimentoEvent: MezzoTimelineItem = {
  id: "mov-1",
  kind: "movimento",
  at: "2026-07-02T14:00:00Z",
  title: "Uscita magazzino",
  ref: { lavorazioneId: LAV_B, origine: "attiva" },
};
const fullFeed = buildMezzoTimelineFeed(
  baseInput({ timeline: [tagliandoEvent, movimentoEvent] }),
);
const tagliandiOnly = filterMezzoTimelineFeed(fullFeed, "tagliandi");
assert.equal(tagliandiOnly.length, 1);
assert.equal(tagliandiOnly[0]!.kind, "lavorazioneBlock");
assert.ok(
  (tagliandiOnly[0] as { categories: string[] }).categories.includes("tagliando"),
);

// sistema filter isolates lifecycle
const lifecycle: MezzoTimelineItem = {
  id: "life-1",
  kind: "lifecycle",
  at: "2026-01-01T10:00:00Z",
  title: "Creazione mezzo",
};
const feedLife = buildMezzoTimelineFeed(baseInput({ timeline: [lifecycle] }));
const sistemaOnly = filterMezzoTimelineFeed(feedLife, "sistema");
assert.equal(sistemaOnly.length, 1);
assert.equal(sistemaOnly[0]!.kind, "standalone");
assert.equal(sistemaOnly[0]!.event.category, "sistema");

// eventCount and categories on block
const feedBlockMeta = buildMezzoTimelineFeed(
  baseInput({
    timeline: [tagliandoEvent, movimentoEvent],
  }),
);
const blockB = feedBlockMeta.find(
  (i): i is MezzoTimelineLavorazioneBlock =>
    i.kind === "lavorazioneBlock" && i.lavorazioneId === LAV_B,
);
assert.ok(blockB);
assert.equal(blockB.eventCount, 1);
assert.deepEqual(blockB.categories, ["movimento"]);

console.log("mezzo-timeline-feed.test.ts OK");
