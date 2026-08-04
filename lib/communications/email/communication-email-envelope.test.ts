import assert from "node:assert/strict";
import { buildCommunicationEmailHtml } from "@/lib/communications/email/communication-email-layout";
import { COMM_EMAIL_LOGO_CID, COMM_EMAIL_THEME } from "@/lib/communications/email/communication-email-theme";
import { resolveCommunicationEmailEnvelope } from "@/lib/communications/email/communication-email-envelope";
import { DEFAULT_COMMUNICATION_SETTINGS } from "@/lib/communications/settings/communication-settings";
import { formatResendFromAddress, parseResendFromEnv } from "@/lib/env/resend-from";

process.env.RESEND_FROM = "Resend Test <noreply@resend.dev>";

const parsed = parseResendFromEnv();
assert.equal(parsed?.email, "noreply@resend.dev");
assert.equal(parsed?.displayName, "Resend Test");

assert.equal(formatResendFromAddress("Autocompattatori", "info@test.it"), "Autocompattatori <info@test.it>");

const envelope = resolveCommunicationEmailEnvelope({
  ...DEFAULT_COMMUNICATION_SETTINGS,
  senderDisplayName: "Officina CAB",
  senderFromEmail: "custom@resend.dev",
  replyToEmail: "risposte@azienda.it",
});
assert.ok(envelope);
assert.equal(envelope!.displayName, "Officina CAB");
assert.equal(envelope!.fromEmail, "custom@resend.dev");
assert.equal(envelope!.replyTo, "risposte@azienda.it");
assert.match(envelope!.from, /Officina CAB/);

const htmlSquare = buildCommunicationEmailHtml({
  displayName: "Officina CAB",
  bodyText: "Ciao mondo",
  logoSrc: `cid:${COMM_EMAIL_LOGO_CID}`,
  logoLayout: "square",
  primaryColor: COMM_EMAIL_THEME.primaryDefault,
  websiteUrl: "https://www.autocompattatori.it",
  websiteHost: "www.autocompattatori.it",
  gestionaleAppUrl: "https://gestionale.example.vercel.app",
  gestionaleAppHost: "gestionale.example.vercel.app",
});
assert.match(htmlSquare, /cid:cab-email-logo/);
assert.match(htmlSquare, /border-radius:12px/);
assert.match(htmlSquare, /Ciao mondo/);
assert.match(htmlSquare, /#f4f4f5/);
assert.match(htmlSquare, /www\.autocompattatori\.it/);
assert.match(htmlSquare, /gestionale\.example\.vercel\.app/);

const htmlWide = buildCommunicationEmailHtml({
  displayName: "Officina CAB",
  bodyText: "Logo largo",
  logoSrc: `cid:${COMM_EMAIL_LOGO_CID}`,
  logoLayout: "wide",
  primaryColor: "#ff6633",
  websiteUrl: "https://www.autocompattatori.it",
  websiteHost: "www.autocompattatori.it",
  gestionaleAppUrl: "https://gestionale.example.vercel.app",
  gestionaleAppHost: "gestionale.example.vercel.app",
});
assert.match(htmlWide, /width:168px/);

console.log("communication-email-envelope.test.ts: ok");
