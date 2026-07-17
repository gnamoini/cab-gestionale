import assert from "node:assert/strict";
import { validateProductionEnv } from "@/lib/ops/validate-production-env";

const ok = validateProductionEnv({ NODE_ENV: "development" } as NodeJS.ProcessEnv);
assert.equal(ok.blockers.length, 0);

const blocked = validateProductionEnv({
  NODE_ENV: "production",
  VERCEL_ENV: "production",
  NEXT_PUBLIC_STAGING_PUBLIC: "1",
} as NodeJS.ProcessEnv);
assert.ok(blocked.blockers.some((b) => b.id === "ops-env-staging-public-production"));

const noGemini = validateProductionEnv({
  NODE_ENV: "production",
  VERCEL_ENV: "production",
} as NodeJS.ProcessEnv);
assert.ok(noGemini.blockers.some((b) => b.id === "ops-env-gemini-not-configured"));

console.log("validate-production-env.test.ts OK");
