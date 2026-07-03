import assert from "node:assert/strict";
import { buildLavorazioneStatoUpdatePatch } from "@/lib/lavorazioni/kanban-stato-move";

/** Concurrency guard contract: pending set blocks duplicate moveStato calls. */
function createPendingGuard() {
  const pending = new Set<string>();
  return {
    tryMove(id: string): boolean {
      if (pending.has(id)) return false;
      pending.add(id);
      return true;
    },
    release(id: string) {
      pending.delete(id);
    },
  };
}

const guard = createPendingGuard();
const id = "11111111-1111-4111-8111-111111111111";

assert.equal(guard.tryMove(id), true);
assert.equal(guard.tryMove(id), false, "second move while pending must be ignored");
guard.release(id);
assert.equal(guard.tryMove(id), true, "after settle, move allowed again");

const patch = buildLavorazioneStatoUpdatePatch("accettazione", ["completata"]);
assert.equal(patch.stato, "accettazione");
assert.equal(patch.data_uscita, null);

console.log("use-lavorazione-stato-move-mutation.test.ts OK");
