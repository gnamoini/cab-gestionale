import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

function exists(rel: string): boolean {
  return fs.existsSync(path.join(ROOT, rel));
}

assert.ok(exists("docs/audit-input-security.md"), "audit-input-security.md missing");
assert.ok(exists("app/login/reset-password/page.tsx"), "reset password page missing");
assert.ok(exists("lib/validation/password-validation.ts"), "password-validation missing");
assert.ok(exists("lib/validation/text-field-limits.ts"), "text-field-limits missing");
assert.ok(exists("lib/validation/services/preventivi-payload.ts"), "preventivi-payload missing");
assert.ok(exists("lib/validation/services/lavorazioni-payload.ts"), "lavorazioni-payload missing");
assert.ok(exists("lib/validation/clamp-free-text.ts"), "clamp-free-text missing");
assert.ok(exists("supabase/migrations/20260706120000_input_text_limits.sql"), "input text limits migration missing");

const masterReport = read("docs/technical-audit-report.md");
assert.match(masterReport, /audit-input-security\.md/);

const adminUsers = read("src/actions/admin-users.ts");
assert.doesNotMatch(adminUsers, /password\.length < 6/);

const loginForm = read("app/login/login-form.tsx");
const forgotModal = read("app/login/login-forgot-password-modal.tsx");
assert.match(forgotModal, /request-password-reset\.client/);
const resetClient = read("lib/auth/request-password-reset.client.ts");
assert.match(resetClient, /\/api\/auth\/request-password-reset/);
assert.match(loginForm, /AuthStandalonePageFooter/);
assert.match(loginForm, /showThemeToggle=\{false\}/);

const middleware = read("src/middleware/proxy-handler.ts");
assert.match(middleware, /RESET_PASSWORD_PATH/);
assert.match(middleware, /PRIVACY_POLICY_PATH/);
assert.match(middleware, /TERMS_AND_CONDITIONS_PATH/);
assert.match(middleware, /isPublicInfoPath/);

const resetForm = read("app/login/reset-password/reset-password-form.tsx");
assert.match(resetForm, /updateUser\(\{ password \}\)/);

const preventiviService = read("src/services/preventivi.service.ts");
assert.match(preventiviService, /pickPreventivoWritePayload/);
assert.doesNotMatch(preventiviService, /\.\.\.before.*\.\.\.data/);

const lavorazioniService = read("src/services/lavorazioni.service.ts");
assert.match(lavorazioniService, /pickLavorazioneWritePayload/);

const promemoria = read("src/services/dashboard-promemoria.service.ts");
assert.match(promemoria, /clampTextOrNull/);
assert.match(promemoria, /PROMEMORIA_DESCRIPTION_MAX/);

const schedeSync = read("lib/schede/schede-sync-adapter.ts");
assert.match(schedeSync, /clampSchedeBundle/);

const checklist = read("docs/checklists/pre-deploy-checklist.md");
assert.match(checklist, /20260706120000_input_text_limits\.sql/);

console.log("input-security-policy: OK");
