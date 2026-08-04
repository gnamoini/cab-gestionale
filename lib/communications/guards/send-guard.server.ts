import type { CommunicationSettings } from "@/lib/communications/settings/communication-settings";
import { isValidEmail } from "@/lib/validation/email";
import { buildTestModeHeader } from "@/lib/communications/template/template-engine.server";
import { evaluateExternalEmailGuard } from "@/lib/communications/guards/external-email-guard";

export type SendResolution =
  | {
      action: "send";
      actualEmail: string;
      testModeActive: boolean;
      prependBody?: string;
    }
  | { action: "simulate"; reason: string }
  | { action: "skip"; reason: string };

export function resolveCommunicationSend(
  settings: CommunicationSettings,
  intendedEmail: string,
  intendedName: string,
): SendResolution {
  const email = intendedEmail.trim();
  if (!email || !isValidEmail(email)) {
    return { action: "skip", reason: "invalid_or_missing_email" };
  }

  if (settings.dryRunEnabled) {
    return { action: "simulate", reason: "dry_run_enabled" };
  }

  const externalGuard = evaluateExternalEmailGuard();

  if (!externalGuard.allowed) {
    if (settings.testMode && isValidEmail(settings.testEmailAddress)) {
      return {
        action: "send",
        actualEmail: settings.testEmailAddress.trim(),
        testModeActive: true,
        prependBody: buildTestModeHeader(intendedName, email),
      };
    }
    return { action: "skip", reason: "external_emails_blocked" };
  }

  if (settings.testMode) {
    const testAddr = settings.testEmailAddress.trim();
    if (!isValidEmail(testAddr)) {
      return { action: "skip", reason: "test_mode_missing_test_email" };
    }
    return {
      action: "send",
      actualEmail: testAddr,
      testModeActive: true,
      prependBody: buildTestModeHeader(intendedName, email),
    };
  }

  if (!settings.clientEmailEnabled) {
    return { action: "skip", reason: "client_email_disabled" };
  }

  return {
    action: "send",
    actualEmail: email,
    testModeActive: false,
  };
}
