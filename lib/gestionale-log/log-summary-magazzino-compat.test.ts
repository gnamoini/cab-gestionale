import assert from "node:assert/strict";
import { buildLogModificaSummary } from "@/lib/gestionale-log/log-summary";

const summary = buildLogModificaSummary({
  entita: "magazzino_ricambi",
  entita_id: "r-longo",
  azione: "UPDATE",
  payload: {
    before: {
      meta: {
        compatibilitaMezzi: ["Longo —"],
        compatibilitaRefs: [],
      },
    },
    after: {
      meta: {
        compatibilitaMezzi: ["Longo —", "Longo — SL500"],
        compatibilitaRefs: [
          { tree: "attrezzature", marcaId: "m-longo", modelloId: "mod-sl500" },
        ],
      },
    },
  },
});

assert.ok(
  !summary.modifiche.some((line) => /CompatibilitaRefs/i.test(line)),
  "compatibilitaRefs must not appear in log lines",
);

const compatLine = summary.modifiche.find((line) => line.startsWith("Compatibilità"));
assert.ok(compatLine, "expected Compatibilità change line");
assert.match(compatLine!, /Longo SL500/);
assert.ok(!compatLine!.includes("Longo —,"), "must not show raw universal label with empty model");
assert.ok(!/impostato a [“"][^"”]*\(universale\)[^"”]*,/.test(compatLine!), "after value must not list universal + model");

const dualLegacy = buildLogModificaSummary({
  entita: "magazzino_ricambi",
  entita_id: "r-longo",
  azione: "UPDATE",
  payload: {
    before: { meta: { compatibilitaMezzi: ["Longo —", "Longo — SL500"] } },
    after: { meta: { compatibilitaMezzi: ["Longo — SL500"] } },
  },
});
const dualLine = dualLegacy.modifiche.find((l) => l.startsWith("Compatibilità"));
assert.ok(dualLine?.includes("Longo SL500"));
assert.ok(!dualLine?.includes("universale"));

const cached = buildLogModificaSummary({
  entita: "magazzino_ricambi",
  entita_id: "r-schmidt",
  azione: "UPDATE",
  payload: {
    before: {
      meta: {
        compatibilitaMezzi: [
          "Schmidt — AS750",
          "Schmidt — Cleango 400ET",
          "Schmidt — Cleango 500 E6C",
          "Schmidt — Cleango 500ET",
          "Schmidt — Swingo 200",
        ],
      },
    },
    after: { meta: { compatibilitaMezzi: ["Schmidt —"], compatibilitaRefs: [{ tree: "attrezzature", marcaId: "m1" }] } },
    summary: {
      tipoRiga: "AGGIORNAMENTO RICAMBIO",
      oggettoRiga: "Schmidt — Blocco",
      modifiche: [
        "CompatibilitaRefs impostato a “aggiornato”",
        "Compatibilità modificato da “Schmidt — AS750, Schmidt — Cleango 400ET” a “Schmidt —”",
      ],
    },
  },
});

assert.ok(
  !cached.modifiche.some((line) => /CompatibilitaRefs/i.test(line)),
  "cached summary must strip CompatibilitaRefs on read",
);
const schmidtLine = cached.modifiche.find((l) => l.startsWith("Compatibilità"));
assert.ok(schmidtLine?.includes("Schmidt (universale)"), "after must show universale label");
assert.ok(!schmidtLine?.includes("Schmidt —”"), "must not end with raw Schmidt —");

console.log("log-summary-magazzino-compat.test.ts OK");
