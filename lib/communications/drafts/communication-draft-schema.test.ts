import assert from "node:assert/strict";

import { communicationDraftUpsertSchema, dedupeEmails } from "@/lib/communications/drafts/communication-draft-types";

const parsed = communicationDraftUpsertSchema.safeParse({
  senderEmail: "service@autocompattatori.it",
  senderDisplayName: "C.A.B.",
  toEmails: ["fornitore@example.it"],
  ccEmails: ["cc@example.it"],
  bccEmails: [],
  subject: "Ordine fornitore n. 1",
  bodyText: "Buongiorno",
});
assert.equal(parsed.success, true);

const invalid = communicationDraftUpsertSchema.safeParse({
  senderEmail: "not-an-email",
  senderDisplayName: "X",
  toEmails: [],
  subject: "",
  bodyText: "",
});
assert.equal(invalid.success, false);

assert.deepEqual(dedupeEmails(["a@b.it", "A@b.it", "c@d.it"]), ["a@b.it", "c@d.it"]);

console.log("communication-draft-schema.test.ts OK");
