import assert from "node:assert/strict";
import { meaningfulTooltip, resolvePillTooltip } from "@/lib/ui/meaningful-tooltip";

assert.equal(meaningfulTooltip("Da lavorare", "Da lavorare"), undefined);
assert.equal(meaningfulTooltip("Da lavorare", "  da lavorare "), undefined);
assert.equal(meaningfulTooltip("BTE", "Fornitore BTE"), "Fornitore BTE");
assert.equal(meaningfulTooltip("", "Sola lettura"), "Sola lettura");

assert.equal(resolvePillTooltip("Urgente", "Urgente", false), undefined);
assert.equal(resolvePillTooltip("Nome lungo addetto", "Nome lungo addetto", true), "Nome lungo addetto");
assert.equal(resolvePillTooltip("Visibile", "Dettaglio extra", false), "Dettaglio extra");

console.log("lib/ui/meaningful-tooltip.test.ts OK");
