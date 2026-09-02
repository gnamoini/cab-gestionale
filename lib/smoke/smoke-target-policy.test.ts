import assert from "node:assert/strict";
import {
  evaluateSmokeMutationGate,
  isDedicatedSmokeEmail,
  isSmokeProductionSupabaseTarget,
  SMOKE_DEDICATED_EMAIL_DOMAIN,
} from "@/lib/smoke/smoke-target-policy";

assert.equal(SMOKE_DEDICATED_EMAIL_DOMAIN, "@cab-gestionale.ci");
assert.equal(isDedicatedSmokeEmail("github-actions-smoke@cab-gestionale.ci"), true);
assert.equal(isDedicatedSmokeEmail("admin@azienda.it"), false);

const prodEnv = {
  SMOKE_PRODUCTION_SUPABASE_URL: "https://abc.supabase.co",
  NEXT_PUBLIC_SUPABASE_URL: "https://abc.supabase.co",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test",
} as NodeJS.ProcessEnv;

assert.equal(isSmokeProductionSupabaseTarget(prodEnv), true);

const localEnv = {
  SMOKE_PRODUCTION_SUPABASE_URL: "https://abc.supabase.co",
  NEXT_PUBLIC_SUPABASE_URL: "https://local.supabase.co",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test",
  SMOKE_BASE_URL: "http://127.0.0.1:3210",
} as NodeJS.ProcessEnv;

assert.equal(isSmokeProductionSupabaseTarget(localEnv), false);

const blocked = evaluateSmokeMutationGate({
  ...prodEnv,
  SMOKE_ADMIN_EMAIL: "admin@azienda.it",
  SMOKE_ADMIN_PASSWORD: "secret",
  SMOKE_ALLOW_PRODUCTION_MUTATIONS: "1",
  SUPABASE_SERVICE_ROLE_KEY: "service-role",
} as NodeJS.ProcessEnv);
assert.equal(blocked.allowed, false);

const allowedDedicated = evaluateSmokeMutationGate({
  ...prodEnv,
  SMOKE_ADMIN_EMAIL: "local-smoke-admin@cab-gestionale.ci",
  SMOKE_ADMIN_PASSWORD: "secret",
  SMOKE_ALLOW_PRODUCTION_MUTATIONS: "1",
  SUPABASE_SERVICE_ROLE_KEY: "service-role",
  SMOKE_BASE_URL: "http://127.0.0.1:3210",
} as NodeJS.ProcessEnv);
assert.equal(allowedDedicated.allowed, true);

console.log("smoke-target-policy.test.ts: ok");
