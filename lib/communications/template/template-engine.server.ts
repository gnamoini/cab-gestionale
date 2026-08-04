import type { CommunicationTemplateKey } from "@/lib/communications/domain/communication-template-keys";
import { DEFAULT_COMMUNICATION_TEMPLATES } from "@/lib/communications/template/default-templates";
import type { RenderedPayload } from "@/lib/communications/domain/communication-types";

const VAR_RE = /\{\{(\w+)\}\}/g;

export function renderCommunicationTemplate(
  subjectTemplate: string,
  bodyTemplate: string,
  payload: RenderedPayload,
): { subject: string; body: string } {
  const replace = (tpl: string) =>
    tpl.replace(VAR_RE, (_, key: string) => {
      const v = payload[key];
      if (v == null) return "";
      return String(v);
    });

  return {
    subject: replace(subjectTemplate).trim(),
    body: replace(bodyTemplate).trim(),
  };
}

export function getDefaultTemplates(templateKey: CommunicationTemplateKey): {
  subject: string;
  body: string;
  version: number;
} {
  const t = DEFAULT_COMMUNICATION_TEMPLATES[templateKey];
  return { subject: t.subject, body: t.body, version: 1 };
}

export function buildTestModeHeader(intendedName: string, intendedEmail: string): string {
  return [
    "==============================",
    "",
    "EMAIL INVIATA IN MODALITÀ TEST",
    "",
    "Destinatario reale:",
    "",
    intendedName.trim() || "—",
    intendedEmail.trim() || "—",
    "",
    "==============================",
    "",
    "",
  ].join("\n");
}
