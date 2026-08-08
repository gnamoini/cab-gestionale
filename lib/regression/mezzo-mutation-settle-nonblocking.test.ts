/**
 * RQ v5: mutateAsync attende onSettled — refetch active lento non deve bloccare resolve.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { QueryClient } from "@tanstack/react-query";

const ROOT = process.cwd();

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

const settle = read("lib/sync/settle-mezzo-mutation-cache.ts");
assert.match(settle, /await invalidateAfterMezzoMutations\([\s\S]*refetchType:\s*"none"/);
assert.match(settle, /void qc\.invalidateQueries\([\s\S]*refetchType:\s*"active"/);
assert.doesNotMatch(
  settle,
  /await qc\.invalidateQueries\([^)]*refetchType:\s*"active"/,
);

/** Contratto void active refetch: settle await solo `none`, active in background. */
async function testVoidActiveRefetchDoesNotBlockSettle(): Promise<void> {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  let activeRefetchStarted = false;
  let releaseActive: (() => void) | null = null;
  const activeGate = new Promise<void>((resolve) => {
    releaseActive = resolve;
  });

  const originalInvalidate = qc.invalidateQueries.bind(qc);
  qc.invalidateQueries = (async (filters?: Parameters<QueryClient["invalidateQueries"]>[0]) => {
    const refetchType =
      filters && typeof filters === "object" && "refetchType" in filters
        ? filters.refetchType
        : "active";
    if (refetchType === "active") {
      activeRefetchStarted = true;
      await activeGate;
    }
    return originalInvalidate(filters);
  }) as QueryClient["invalidateQueries"];

  const settle = async (): Promise<void> => {
    await qc.invalidateQueries({ queryKey: ["mezzi"], refetchType: "none" });
    void qc.invalidateQueries({ queryKey: ["mezzi"], refetchType: "active" });
  };

  const raced = await Promise.race([
    settle().then(() => "settled" as const),
    new Promise<"timeout">((resolve) => setTimeout(() => resolve("timeout"), 500)),
  ]);

  assert.equal(raced, "settled");
  assert.equal(activeRefetchStarted, true);
  releaseActive?.();
}

const removeMut = read("src/hooks/gestionale/use-mezzo-remove-mutation.ts");
assert.match(removeMut, /settleMezzoMutationCache/);
assert.doesNotMatch(removeMut, /invalidateAfterMezzoMutations/);

void testVoidActiveRefetchDoesNotBlockSettle().then(() => {
  console.log("mezzo-mutation-settle-nonblocking.test.ts: ok");
});
