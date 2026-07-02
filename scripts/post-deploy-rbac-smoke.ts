#!/usr/bin/env npx tsx
/**
 * Post-deploy RBAC smoke: verifica che l'app risponda e che il gate Playwright RBAC nav sia configurato.
 * Uso: PRODUCTION_URL=https://... npx tsx scripts/post-deploy-rbac-smoke.ts
 */
import { spawnSync } from "node:child_process";

async function main(): Promise<void> {
  const baseUrl = process.env.PRODUCTION_URL?.trim() || process.env.SMOKE_BASE_URL?.trim();
  if (!baseUrl) {
    console.error("post-deploy-rbac-smoke: set PRODUCTION_URL or SMOKE_BASE_URL");
    process.exit(1);
  }

  const health = await fetch(`${baseUrl.replace(/\/$/, "")}/login`, { method: "GET" });
  if (!health.ok) {
    console.error(`post-deploy-rbac-smoke: health check failed (${health.status})`);
    process.exit(1);
  }

  const hasAdmin =
    Boolean(process.env.SMOKE_ADMIN_EMAIL?.trim()) && Boolean(process.env.SMOKE_ADMIN_PASSWORD?.trim());
  if (!hasAdmin) {
    console.error("post-deploy-rbac-smoke: SMOKE_ADMIN_EMAIL/PASSWORD required");
    process.exit(1);
  }

  if (
    !process.env.SMOKE_OPERATOR_EMAIL?.trim() ||
    !process.env.SMOKE_OPERATOR_PASSWORD?.trim()
  ) {
    console.warn("post-deploy-rbac-smoke: SMOKE_OPERATOR_* not set — operator nav check skipped in Playwright");
  }

  const run = spawnSync(
    "npx",
    ["playwright", "test", "e2e/smoke/20-rbac-nav-by-role.spec.ts", "--config=e2e/playwright.config.ts"],
    {
      stdio: "inherit",
      env: { ...process.env, SMOKE_BASE_URL: baseUrl },
      shell: process.platform === "win32",
    },
  );

  process.exit(run.status ?? 1);
}

void main();
