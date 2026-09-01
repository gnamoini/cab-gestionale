import assert from "node:assert/strict";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  flushAllModificaLogs,
  queueModificaLog,
  resetModificaLogBatchStateForTest,
  type FlushModificaLogFn,
} from "@/src/services/internal/log-modifiche-batcher";

const USER_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const USER_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

function mockClient(userId: string | null): SupabaseClient {
  return {
    auth: {
      getUser: async () => ({ data: { user: userId ? { id: userId } : null }, error: null }),
    },
  } as unknown as SupabaseClient;
}

async function testFrozenAutoreSurvivesSessionSwitch() {
  let sessionUser = USER_A;
  const client = {
    auth: {
      getUser: async () => ({
        data: { user: sessionUser ? { id: sessionUser } : null },
        error: null,
      }),
    },
  } as unknown as SupabaseClient;

  const flushed: { autore_id?: string | null }[] = [];
  const flush: FlushModificaLogFn = async (input) => {
    flushed.push({ autore_id: input.autore_id });
  };

  const pending = queueModificaLog(flush, client, {
    client,
    entita: "magazzino_ricambi",
    entita_id: "ric-1",
    azione: "UPDATE",
    payload: { before: { scorta: 1 }, after: { scorta: 2 } },
  });

  assert.equal(flushed.length, 0, "batched log should not flush immediately");
  sessionUser = USER_B;
  await flushAllModificaLogs(flush);
  await pending;

  assert.equal(flushed.length, 1);
  assert.equal(flushed[0]!.autore_id, USER_A, "autore_id must be frozen at enqueue, not flush session");
}

async function testImmediatePathFreezesAtCallTime() {
  let sessionUser = USER_A;
  const client = {
    auth: {
      getUser: async () => ({
        data: { user: sessionUser ? { id: sessionUser } : null },
        error: null,
      }),
    },
  } as unknown as SupabaseClient;

  const flushed: { autore_id?: string | null }[] = [];
  const flush: FlushModificaLogFn = async (input) => {
    flushed.push({ autore_id: input.autore_id });
  };

  await queueModificaLog(flush, client, {
    client,
    entita: "lavorazioni",
    entita_id: "lav-1",
    azione: "UPDATE",
    payload: {},
  });

  sessionUser = USER_B;
  assert.equal(flushed.length, 1);
  assert.equal(flushed[0]!.autore_id, USER_A);
}

async function testExplicitAutoreIdNotReResolved() {
  const client = mockClient(USER_B);
  const flushed: { autore_id?: string | null }[] = [];
  const flush: FlushModificaLogFn = async (input) => {
    flushed.push({ autore_id: input.autore_id });
  };

  const pending = queueModificaLog(flush, client, {
    client,
    entita: "magazzino_ricambi",
    entita_id: "ric-2",
    azione: "UPDATE",
    payload: { before: {}, after: {} },
    autore_id: USER_A,
  });

  await flushAllModificaLogs(flush);
  await pending;
  assert.equal(flushed[0]!.autore_id, USER_A);
}

async function main() {
  resetModificaLogBatchStateForTest();
  await testFrozenAutoreSurvivesSessionSwitch();
  resetModificaLogBatchStateForTest();
  await testImmediatePathFreezesAtCallTime();
  resetModificaLogBatchStateForTest();
  await testExplicitAutoreIdNotReResolved();
  console.log("log-modifiche-batcher-autore.test.ts OK");
}

void main();
