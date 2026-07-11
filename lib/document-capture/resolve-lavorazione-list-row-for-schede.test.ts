import assert from "node:assert/strict";
import { resolveLavorazioneListRowForSchedeOpen } from "@/lib/document-capture/resolve-lavorazione-list-row-for-schede.client";
import type { LavorazioneListRow } from "@/src/services/lavorazioni.service";

const row: LavorazioneListRow = {
  id: "lav-1",
  codice: "26-0001",
  mezzo: null,
} as LavorazioneListRow;

void (async () => {
  const found = await resolveLavorazioneListRowForSchedeOpen("lav-1", [row], async () => undefined);
  assert.equal(found?.id, "lav-1");

  let refetched = false;
  const fromRefetch = await resolveLavorazioneListRowForSchedeOpen("lav-2", [row], async () => {
    refetched = true;
    return { data: [{ ...row, id: "lav-2" }] };
  });
  assert.equal(refetched, true);
  assert.equal(fromRefetch?.id, "lav-2");
})();
