import assert from "node:assert/strict";

import {
  fornitoreAnagraficaToOrdineSnapshot,
  parseFornitoreAnagraficaSettings,
} from "@/lib/magazzino/fornitore-anagrafica";
import { parseOrdineFornitoreFornitoreSnapshot } from "@/lib/ordini-fornitori/fornitore-snapshot";

const anag = parseFornitoreAnagraficaSettings({
  email: "ordini@fornitore.it",
  emailAggiuntive: ["cc@fornitore.it", "bad"],
});
assert.equal(anag.email, "ordini@fornitore.it");
assert.deepEqual(anag.emailAggiuntive, ["cc@fornitore.it"]);

const snap = fornitoreAnagraficaToOrdineSnapshot("Fornitore X", anag);
assert.equal(snap.email, "ordini@fornitore.it");
assert.deepEqual(snap.emailAggiuntive, ["cc@fornitore.it"]);

const parsedSnap = parseOrdineFornitoreFornitoreSnapshot(
  { email: "a@b.it", emailAggiuntive: ["c@d.it"] },
  "Label",
);
assert.equal(parsedSnap.email, "a@b.it");
assert.deepEqual(parsedSnap.emailAggiuntive, ["c@d.it"]);

console.log("ordine-fornitore-draft-defaults.test.ts OK");
