import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

const loaders = read("components/public-surfaces/public-surface-loaders.tsx");
const loginPage = read("app/login/page.tsx");
const resetPage = read("app/login/reset-password/page.tsx");
const notFound = read("app/not-found.tsx");
const gestNotFound = read("app/(gestionale)/not-found.tsx");
const privacyPage = read("app/privacy-policy/page.tsx");
const offlinePage = read("app/offline/page.tsx");
const loginForm = read("app/login/login-form.tsx");
const postAuth = read("app/login/login-post-auth-redirect.tsx");
const notFoundView = read("components/gestionale/not-found-view.tsx");
const privacyView = read("components/legal/privacy-policy-view.tsx");
const privacyBody = read("components/legal/privacy-policy-body.tsx");
const errorRoot = read("app/error.tsx");
const errorGest = read("app/(gestionale)/error.tsx");
const budget = read("lib/performance/performance-budget-registry.ts");

assert.match(loaders, /LoginFormLazy/);
assert.match(loaders, /ResetPasswordFormLazy/);
assert.match(loaders, /NotFoundViewLazy/);
assert.match(loaders, /PrivacyPolicyViewLazy/);
assert.match(loaders, /OfflinePageViewLazy/);
assert.match(loaders, /GestionaleErrorFallbackLazy/);
assert.match(loaders, /dynamic\s*\(/);

assert.match(loginPage, /LoginFormLazy/);
assert.match(resetPage, /ResetPasswordFormLazy/);
assert.match(notFound, /NotFoundViewLazy/);
assert.match(gestNotFound, /NotFoundViewLazy/);
assert.match(privacyPage, /PrivacyPolicyViewLazy/);
assert.match(privacyPage, /PrivacyPolicyBody/);
assert.match(offlinePage, /OfflinePageViewLazy/);

assert.doesNotMatch(loginForm, /useEffectivePermissionsSource/);
assert.doesNotMatch(loginForm, /useClientLavorazioniAccess/);
assert.match(loginForm, /LoginPostAuthRedirect/);
assert.match(loginForm, /dynamic\s*\(/);
assert.match(postAuth, /useEffectivePermissionsSource/);

assert.match(notFoundView, /StandaloneNotFoundAnonymous/);
assert.doesNotMatch(
  notFoundView.split("StandaloneNotFoundAnonymous")[1]?.split("function StandaloneNotFoundContent")[0] ?? "",
  /useSafeGestionaleHomeLink/,
);

assert.doesNotMatch(privacyView, /privacy-policy-content/);
assert.doesNotMatch(privacyView, /report-ui-tokens/);
assert.match(privacyBody, /privacy-policy-content/);
assert.match(privacyBody, /privacy-policy-tokens/);

assert.match(errorRoot, /GestionaleErrorFallbackLazy/);
assert.match(errorGest, /GestionaleErrorFallbackLazy/);

assert.match(budget, /route: "\/login"/);
assert.match(budget, /route: "\/privacy-policy"/);
assert.match(budget, /route: "\/offline"/);

console.log("public-surfaces-perf-policy.test.ts OK");
