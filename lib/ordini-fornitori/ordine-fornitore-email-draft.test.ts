import assert from "node:assert/strict";
import {
  buildOrdineFornitoreMailtoHref,
  classifyOrdineFornitoreShareError,
  ORDINE_FORNITORE_FALLBACK_MANUAL_MESSAGE,
  ordineFornitoreEmailAttachmentFileName,
  ordineFornitoreEmailDraftBody,
  ordineFornitoreEmailDraftSubject,
} from "@/lib/ordini-fornitori/ordine-fornitore-email-draft";
import {
  resolveOrdineFornitoreSupplierEmail,
  resolveSupplierEmailFromSnapshot,
} from "@/lib/ordini-fornitori/ordine-fornitore-supplier-email";

assert.equal(ordineFornitoreEmailDraftSubject({ numero: "123" }), "Ordine fornitore #123");
assert.equal(ordineFornitoreEmailDraftSubject({ numero: "" }), "Ordine fornitore");
assert.match(
  ordineFornitoreEmailDraftBody({ numero: "123" }),
  /in allegato trasmettiamo l'ordine 123/,
);
assert.equal(ordineFornitoreEmailAttachmentFileName({ numero: "12/24" }), "Ordine-12-24.pdf");
assert.equal(ORDINE_FORNITORE_FALLBACK_MANUAL_MESSAGE, "PDF scaricato. Allegalo manualmente alla mail.");

assert.equal(resolveSupplierEmailFromSnapshot({ email: "a@b.it" }), "a@b.it");
assert.equal(resolveSupplierEmailFromSnapshot({ email_fornitore: "c@d.it" }), "c@d.it");
assert.equal(resolveSupplierEmailFromSnapshot({ email: "bad" }), "");

assert.equal(
  resolveOrdineFornitoreSupplierEmail(
    { fornitoreLabel: "Forn1", fornitoreSnapshot: { email: "snap@forn.it" } },
    null,
  ),
  "snap@forn.it",
);

assert.equal(
  resolveOrdineFornitoreSupplierEmail(
    { fornitoreLabel: "Forn1", fornitoreSnapshot: {} },
    {
      marche: [],
      categorie: [],
      mezziCompatibili: [],
      fornitori: [],
      produttori: [],
      fornitoreAnagraficaByFornitore: {
        forn1: {
          ragioneSociale: "",
          indirizzo: "",
          partitaIva: "",
          codiceFiscale: "",
          telefono: "",
          email: "mag@forn.it",
          emailAggiuntive: [],
        },
      },
    },
  ),
  "mag@forn.it",
);

const mailto = buildOrdineFornitoreMailtoHref("test@forn.it", { numero: "99" });
assert.match(mailto, /^mailto:test%40forn\.it\?/);
assert.match(mailto, /subject=Ordine\+fornitore/);

assert.equal(classifyOrdineFornitoreShareError(new DOMException("aborted", "AbortError")), "cancelled");
assert.equal(classifyOrdineFornitoreShareError(new Error("fail")), "fallback");

console.log("ordine-fornitore-email-draft.test.ts OK");
