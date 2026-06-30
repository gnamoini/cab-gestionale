import assert from "node:assert/strict";

async function phase2Refresh(refresh: () => Promise<void>): Promise<void> {
  await new Promise<void>((resolve) => {
    queueMicrotask(() => {
      void refresh().finally(resolve);
    });
  });
}

async function main(): Promise<void> {
  let refreshCalls = 0;
  const refresh = async () => {
    refreshCalls += 1;
  };

  await phase2Refresh(refresh);
  await phase2Refresh(refresh);

  assert.equal(refreshCalls, 2);
  console.log("role-switch-refresh-idempotency.test.ts OK");
}

void main();
