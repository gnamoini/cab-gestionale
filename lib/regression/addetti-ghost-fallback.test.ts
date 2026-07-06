import assert from "node:assert/strict";
import { resolveAddettoDisplayLabel } from "@/lib/lavorazioni/resolve-addetto-display";
import type { LavorazioneListRow } from "@/src/services/lavorazioni.service";

const row = { id: "lav-empty" } as LavorazioneListRow;
const addettiAttivi = ["Mario", "Luigi"];

const label = resolveAddettoDisplayLabel(row, { schedeStore: {} });
assert.equal(label, "—", "lavorazione senza addetto non deve usare addetti[0]");
assert.notEqual(label, addettiAttivi[0]);

console.log("addetti-ghost-fallback.test.ts OK");
