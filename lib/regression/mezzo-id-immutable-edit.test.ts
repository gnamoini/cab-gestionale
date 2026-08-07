import assert from "node:assert/strict";
import {
  applyMezzoIdImmutabilityGuard,
} from "@/lib/domain/intervento-context/build-edit-lavorazione-patch";
import type { LavorazioneListRow } from "@/src/services/lavorazioni.service";

const row = {
  id: "lav-1",
  mezzo_id: "mezzo-fixed",
} as LavorazioneListRow;

const stripped = applyMezzoIdImmutabilityGuard(
  row,
  { mezzo_id: "other-mezzo", note: "ok" },
  false,
);
assert.equal(stripped.mezzo_id, undefined);
assert.equal(stripped.note, "ok");

const allowed = applyMezzoIdImmutabilityGuard(
  row,
  { mezzo_id: "other-mezzo" },
  true,
);
assert.equal(allowed.mezzo_id, "other-mezzo");

console.log("mezzo-id-immutable-edit.test.ts: ok");
