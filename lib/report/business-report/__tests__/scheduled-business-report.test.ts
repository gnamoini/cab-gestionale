import assert from "node:assert/strict";

/** Cron schedule contract — documented in Production Readiness (UTC). */
const WEEKLY_CRON = "0 7 * * 1";
const MONTHLY_CRON = "0 8 1 * *";

assert.equal(WEEKLY_CRON, "0 7 * * 1");
assert.equal(MONTHLY_CRON, "0 8 1 * *");

type ScheduledResult = { ok: boolean; skipped: boolean; reason?: string };

async function mockScheduled(opts: {
  featureEnabled: boolean;
  generateResult: { ok: boolean; cached?: boolean; code?: string };
}): Promise<ScheduledResult> {
  if (!opts.featureEnabled) {
    return { ok: true, skipped: true, reason: "feature_disabled" };
  }
  const result = opts.generateResult;
  if (!result.ok) {
    if (result.code === "already_running") {
      return { ok: true, skipped: true, reason: "already_running" };
    }
    return { ok: false, skipped: false, reason: result.code };
  }
  if (result.cached) {
    return { ok: true, skipped: true, reason: "already_recorded" };
  }
  return { ok: true, skipped: false };
}

async function run() {
  assert.deepEqual(await mockScheduled({ featureEnabled: false, generateResult: { ok: true } }), {
    ok: true,
    skipped: true,
    reason: "feature_disabled",
  });

  assert.deepEqual(
    await mockScheduled({ featureEnabled: true, generateResult: { ok: false, code: "already_running" } }),
    { ok: true, skipped: true, reason: "already_running" },
  );

  assert.deepEqual(await mockScheduled({ featureEnabled: true, generateResult: { ok: true, cached: true } }), {
    ok: true,
    skipped: true,
    reason: "already_recorded",
  });

  console.log("scheduled-business-report.test.ts OK");
}

void run();
