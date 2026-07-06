/**
 * Smoke: LoadingManager — mutua esclusione e wiring gate.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

function main(): void {
  const manager = read("context/global-loading-context.tsx");
  assert.match(manager, /LoadingManagerProvider/);
  assert.match(manager, /useLoadingClaim/);
  assert.match(manager, /useIsWinningClaim/);
  assert.match(manager, /resolveWinningSurface/);

  const rbacGuard = read("components/gestionale/rbac-page-guard.tsx");
  assert.match(rbacGuard, /useLoadingClaim\("skeleton", "rbac-guard"/);
  assert.match(rbacGuard, /useIsWinningClaim\("skeleton", "rbac-guard"/);

  const topNotice = read("components/gestionale/gestionale-top-notice.tsx");
  assert.match(topNotice, /useLoadingClaim\("banner"/);
  assert.match(topNotice, /useIsWinningClaim\("banner"/);

  const authGate = read("components/gestionale/gestionale-auth-gate.tsx");
  assert.match(
    authGate,
    /showAuthBanner =[\s\S]*status === "loading" \|\| status === "anonymous"/,
  );

  const appShell = read("components/gestionale/app-shell.tsx");
  assert.doesNotMatch(appShell, /useGlobalLoading/);
  assert.doesNotMatch(appShell, /GLOBAL_LOADING_MESSAGES\.navigation/);
  assert.doesNotMatch(appShell, /routeLoading/);

  const loginForm = read("app/login/login-form.tsx");
  assert.doesNotMatch(loginForm, /GlobalLoadingView/);
  assert.doesNotMatch(loginForm, /LoginAuthWaitShell/);
  assert.match(loginForm, /useGlobalLoading/);
  assert.match(loginForm, /setRedirecting\(true\)/);

  const resetForm = read("app/login/reset-password/reset-password-form.tsx");
  assert.doesNotMatch(resetForm, /GlobalLoadingView/);
  assert.match(resetForm, /useGlobalLoading/);

  const priority = read("lib/ui/loading-manager.ts");
  assert.match(priority, /overlay: 100/);
  assert.match(priority, /skeleton: 60/);
  assert.match(priority, /banner: 40/);

  console.log("loading-manager-policy.test: OK");
}

main();
