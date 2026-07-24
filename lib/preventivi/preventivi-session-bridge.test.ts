import assert from "node:assert/strict";
import { test } from "node:test";
import {
  clearPendingPreventivoPayload,
  dedupePendingPreventivoAppend,
  peekPendingPreventivoPayload,
  writePendingPreventivoPayload,
  type PendingPreventivoPayload,
} from "@/lib/preventivi/preventivi-session-bridge";
import type { LavorazioneAttiva } from "@/lib/lavorazioni/types";

const storage = new Map<string, string>();

Object.defineProperty(globalThis, "sessionStorage", {
  value: {
    getItem: (k: string) => storage.get(k) ?? null,
    setItem: (k: string, v: string) => {
      storage.set(k, v);
    },
    removeItem: (k: string) => {
      storage.delete(k);
    },
  },
  configurable: true,
});

const lav = { id: "lav-1", note: "" } as LavorazioneAttiva;
const payload: PendingPreventivoPayload = {
  lav,
  origine: "attiva",
  bundle: { lavorazioneId: lav.id, ingresso: null, lavorazioni: null, ricambi: null },
};

test("peek non consuma il payload; clear solo dopo successo", () => {
  storage.clear();
  writePendingPreventivoPayload(payload);
  assert.ok(peekPendingPreventivoPayload());
  assert.ok(peekPendingPreventivoPayload());
  clearPendingPreventivoPayload();
  assert.equal(peekPendingPreventivoPayload(), null);
});

test("dedupePendingPreventivoAppend riusa la stessa promise", async () => {
  let runs = 0;
  const p1 = dedupePendingPreventivoAppend(async () => {
    runs += 1;
    return "ok";
  });
  const p2 = dedupePendingPreventivoAppend(async () => {
    runs += 1;
    return "dup";
  });
  assert.equal(await p1, "ok");
  assert.equal(await p2, "ok");
  assert.equal(runs, 1);
});

console.log("preventivi-session-bridge.test.ts OK");
