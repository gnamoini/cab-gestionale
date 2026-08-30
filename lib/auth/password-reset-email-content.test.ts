import assert from "node:assert/strict";
import {
  buildPasswordResetEmailText,
  PASSWORD_RESET_EMAIL_CTA_LABEL,
  PASSWORD_RESET_EMAIL_SUBJECT,
} from "@/lib/auth/password-reset-email-content";

assert.match(PASSWORD_RESET_EMAIL_SUBJECT, /Reimposta la password/);
assert.equal(PASSWORD_RESET_EMAIL_CTA_LABEL, "Reimposta password");

const text = buildPasswordResetEmailText({
  displayName: "Officina CAB",
  resetUrl: "https://example.com/reset",
});
assert.match(text, /Gentile utente/);
assert.match(text, /https:\/\/example\.com\/reset/);
assert.match(text, /Officina CAB/);
assert.match(text, /ignorare questa email/);

console.log("password-reset-email-content.test.ts: ok");
