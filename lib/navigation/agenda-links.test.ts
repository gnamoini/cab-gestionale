import assert from "node:assert/strict";
import { buildAgendaHref, buildAgendaFromLavorazioneHref, AGENDA_BASE_PATH, parseAgendaSearchParams } from "@/lib/navigation/agenda-links";
import { resolveAgendaInsightLegacyHref, agendaUrlSnapshotKey } from "@/lib/navigation/agenda-url-sync";

assert.equal(buildAgendaHref(), AGENDA_BASE_PATH);
assert.match(buildAgendaHref({ date: "2026-07-03", view: "week", event: "ev-1" }), /date=2026-07-03/);
assert.match(buildAgendaHref({ workOrder: "wo-1" }), /workOrder=wo-1/);
assert.ok(!buildAgendaHref({ date: "2026-07-03" }).includes("workOrder="));
assert.match(buildAgendaFromLavorazioneHref("wo-1"), /workOrder=wo-1/);

const legacy = resolveAgendaInsightLegacyHref(new URLSearchParams("view=insight&date=2026-07-03"));
assert.ok(legacy);
assert.match(legacy!, /panel=insights/);
assert.ok(!legacy!.includes("view=insight"));

const legacyWithPanel = resolveAgendaInsightLegacyHref(new URLSearchParams("view=insight&panel=heatmap"));
assert.ok(legacyWithPanel);
assert.match(legacyWithPanel!, /panel=heatmap/);
assert.ok(!legacyWithPanel!.includes("view=insight"));

const parsedInsight = parseAgendaSearchParams(new URLSearchParams("view=insight"));
assert.equal(parsedInsight.legacyInsightView, true);
assert.equal(parsedInsight.panel, "insights");

const key = agendaUrlSnapshotKey({
  date: "2026-07-03",
  view: "day",
  eventId: null,
  workOrderId: null,
  hourSlot: null,
  panel: null,
});
assert.match(key, /date=2026-07-03/);

console.log("agenda-links.test.ts OK");
