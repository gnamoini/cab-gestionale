import assert from "node:assert/strict";
import {
  buildLavorazioneFocusHref,
  buildMagazzinoRicambioFocusHref,
  resolveHealthScoreFactorHref,
} from "@/lib/health-score/explain/health-score-factor-nav";

const sources = {
  lateIngressLavorazioneIds: ["lav-late-1"],
  inactiveLavorazioneIds: ["lav-stale-1"],
  stockCriticalRicambioIds: ["ric-1"],
};

assert.equal(
  resolveHealthScoreFactorHref(sources, { kind: "risk", id: "late-ingress" }),
  buildLavorazioneFocusHref("lav-late-1"),
);
assert.equal(
  resolveHealthScoreFactorHref(sources, { kind: "risk", id: "stagnation" }),
  buildLavorazioneFocusHref("lav-stale-1"),
);
assert.equal(
  resolveHealthScoreFactorHref(sources, { kind: "kpi", id: "stock-critical" }),
  buildMagazzinoRicambioFocusHref("ric-1"),
);
assert.equal(resolveHealthScoreFactorHref(sources, { kind: "kpi", id: "backlog" }), "/lavorazioni");
assert.equal(resolveHealthScoreFactorHref(sources, { kind: "kpi", id: "hours-worked" }), "/dipendenti");

const emptySources = {
  lateIngressLavorazioneIds: [],
  inactiveLavorazioneIds: [],
  stockCriticalRicambioIds: [],
};
assert.equal(
  resolveHealthScoreFactorHref(emptySources, { kind: "risk", id: "late-ingress" }),
  "/lavorazioni",
);

console.log("health-score-factor-nav.test.ts OK");
