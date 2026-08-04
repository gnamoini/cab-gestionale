import { evaluateExternalEmailGuard, isExternalEmailAllowed } from "@/lib/communications/guards/external-email-guard";
import { resolveCommunicationSend } from "@/lib/communications/guards/send-guard.server";
import { DEFAULT_COMMUNICATION_SETTINGS } from "@/lib/communications/settings/communication-settings";

const prev = process.env.ALLOW_EXTERNAL_EMAILS;
process.env.ALLOW_EXTERNAL_EMAILS = "false";

if (isExternalEmailAllowed()) throw new Error("expected false");
if (evaluateExternalEmailGuard().allowed) throw new Error("guard should block");

const skip = resolveCommunicationSend(
  { ...DEFAULT_COMMUNICATION_SETTINGS, testMode: false, clientEmailEnabled: true },
  "cliente@example.com",
  "Cliente",
);
if (skip.action !== "skip") throw new Error("expected skip when external blocked");

const testSend = resolveCommunicationSend(
  { ...DEFAULT_COMMUNICATION_SETTINGS, testMode: true, testEmailAddress: "test@example.com" },
  "cliente@example.com",
  "Cliente",
);
if (testSend.action !== "send" || testSend.actualEmail !== "test@example.com") {
  throw new Error("expected test redirect");
}

process.env.ALLOW_EXTERNAL_EMAILS = prev;

console.log("send-guard.test.ts: ok");
