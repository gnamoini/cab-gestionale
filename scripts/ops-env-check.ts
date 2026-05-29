import assert from "node:assert/strict";
import { validateProductionEnv } from "@/lib/ops/validate-production-env";

const r = validateProductionEnv({ NODE_ENV: "test" } as NodeJS.ProcessEnv);
assert.equal(r.blockers.length, 0, `unexpected blockers: ${r.blockers.map((b) => b.id).join(", ")}`);

const prodBad = validateProductionEnv({
  NODE_ENV: "production",
  NEXT_PUBLIC_ENABLE_OPERATOR_GLOBAL_SETTINGS: "1",
} as NodeJS.ProcessEnv);
assert.ok(prodBad.blockers.some((b) => b.id === "ops-env-pilot-production"));

console.log("ops-env-check.ts OK");
