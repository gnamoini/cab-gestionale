import assert from "node:assert/strict";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import {
  isReconcileInFlight,
  reconcileSession,
  resetAuthSessionCoordinatorForTests,
} from "@/src/lib/auth/auth-session-coordinator.client";

const fakeUser = { id: "u1", email: "a@b.c" } as User;

function makeSb(handlers: {
  getUser: () => Promise<{ data: { user: User | null }; error: { message: string } | null }>;
  refreshSession?: () => Promise<{ error: { message: string } | null }>;
}): SupabaseClient {
  return {
    auth: {
      getUser: handlers.getUser,
      refreshSession: handlers.refreshSession ?? (async () => ({ error: null })),
    },
  } as unknown as SupabaseClient;
}

resetAuthSessionCoordinatorForTests();

let getUserCalls = 0;
const sbValid = makeSb({
  getUser: async () => {
    getUserCalls += 1;
    return { data: { user: fakeUser }, error: null };
  },
});

void (async () => {
  const [a, b] = await Promise.all([
    reconcileSession(sbValid, { reason: "manual" }),
    reconcileSession(sbValid, { reason: "visibility" }),
  ]);
  assert.equal(getUserCalls, 1, "single-flight: one getUser for concurrent reconcile");
  assert.equal(a.verdict, "valid");
  assert.equal(b.verdict, "valid");
  assert.equal(a.debugId, b.debugId, "same in-flight shares debugId result");

  resetAuthSessionCoordinatorForTests();
  let refreshCalls = 0;
  getUserCalls = 0;
  const sbRecover = makeSb({
    getUser: async () => {
      getUserCalls += 1;
      if (getUserCalls === 1) {
        return { data: { user: null }, error: { message: "JWT expired" } };
      }
      return { data: { user: fakeUser }, error: null };
    },
    refreshSession: async () => {
      refreshCalls += 1;
      return { error: null };
    },
  });
  const recovered = await reconcileSession(sbRecover, { reason: "manual" });
  assert.equal(recovered.verdict, "valid");
  assert.equal(refreshCalls, 1, "refreshSession only on recoverable error");
  assert.equal(getUserCalls, 2);

  resetAuthSessionCoordinatorForTests();
  getUserCalls = 0;
  const sbInvalid = makeSb({
    getUser: async () => {
      getUserCalls += 1;
      return {
        data: { user: null },
        error: { message: "Invalid Refresh Token: Refresh Token Not Found" },
      };
    },
  });
  const invalid = await reconcileSession(sbInvalid);
  assert.equal(invalid.verdict, "invalid");
  assert.equal(getUserCalls, 1);

  resetAuthSessionCoordinatorForTests();
  const sbPending = makeSb({
    getUser: async () => ({
      data: { user: null },
      error: { message: "Failed to fetch" },
    }),
  });
  const pending = await reconcileSession(sbPending);
  assert.equal(pending.verdict, "pending");

  assert.equal(isReconcileInFlight(), false);

  console.log("auth-session-coordinator.test.ts OK");
})();
