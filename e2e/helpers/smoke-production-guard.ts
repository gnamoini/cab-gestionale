import { evaluateSmokeMutationGate } from "@/lib/smoke/smoke-target-policy";
import type { Page, TestType } from "@playwright/test";
import { attachConsoleGuards } from "./console";

const hasSmokeCreds = Boolean(
  process.env.SMOKE_ADMIN_EMAIL?.trim() && process.env.SMOKE_ADMIN_PASSWORD?.trim(),
);

/** Skip message per spec mutanti quando il target non è sicuro (es. production senza opt-in). */
export function smokeMutationSkipReason(): string | null {
  if (!hasSmokeCreds) {
    return "SMOKE_ADMIN_EMAIL e SMOKE_ADMIN_PASSWORD richiesti";
  }
  const gate = evaluateSmokeMutationGate();
  return gate.allowed ? null : gate.reason;
}

/** beforeEach condiviso per spec smoke che creano/modificano dati. */
export function registerMutatingSmokeGuards(test: TestType<object, { page: Page }>): void {
  test.beforeEach(({ page }) => {
    const block = smokeMutationSkipReason();
    test.skip(Boolean(block), block ?? "smoke guard");
    attachConsoleGuards(page);
  });
}
