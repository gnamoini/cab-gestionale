import assert from "node:assert/strict";
import { tryShareOrdineFornitorePdfDraft } from "@/lib/ordini-fornitori/ordine-fornitore-email-draft.client";

async function run() {
  const file = new File([new Uint8Array([1, 2, 3])], "Ordine-1.pdf", { type: "application/pdf" });
  const subject = "Ordine fornitore #1";
  const body = "Buongiorno, in allegato trasmettiamo il nostro ordine.";

  assert.equal(
    await tryShareOrdineFornitorePdfDraft(file, subject, body, {
      share: async () => {},
      canShare: () => true,
    }),
    "shared",
  );

  assert.equal(
    await tryShareOrdineFornitorePdfDraft(file, subject, body, {
      share: async () => {
        throw new DOMException("aborted", "AbortError");
      },
      canShare: () => true,
    }),
    "cancelled",
  );

  assert.equal(
    await tryShareOrdineFornitorePdfDraft(file, subject, body, {
      share: async () => {
        throw new Error("share failed");
      },
      canShare: () => true,
    }),
    "fallback",
  );

  assert.equal(
    await tryShareOrdineFornitorePdfDraft(file, subject, body, {
      canShare: () => false,
    }),
    "fallback",
  );

  assert.equal(await tryShareOrdineFornitorePdfDraft(file, subject, body, {}), "fallback");

  console.log("ordine-fornitore-email-draft.client.test.ts OK");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
