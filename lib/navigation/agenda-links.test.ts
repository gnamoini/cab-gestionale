import assert from "node:assert/strict";
import { buildAgendaHref, buildAgendaFromLavorazioneHref, AGENDA_BASE_PATH } from "@/lib/navigation/agenda-links";

assert.equal(buildAgendaHref(), AGENDA_BASE_PATH);
assert.match(buildAgendaHref({ date: "2026-07-03", view: "week", event: "ev-1" }), /date=2026-07-03/);
assert.match(buildAgendaHref({ workOrder: "wo-1" }), /workOrder=wo-1/);
assert.match(buildAgendaFromLavorazioneHref("wo-1"), /workOrder=wo-1/);

console.log("agenda-links.test.ts OK");
