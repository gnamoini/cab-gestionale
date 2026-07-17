import type { Metadata } from "next";
import { PrivacyPolicyBody } from "@/components/legal/privacy-policy-body";
import { PrivacyPolicyViewLazy } from "@/components/public-surfaces/public-surface-loaders";

export const metadata: Metadata = {
  title: "Informativa privacy | CAB Gestionale Officina",
  description:
    "Informativa sul trattamento dei dati personali ai sensi del GDPR per l'area riservata CAB Gestionale Officina.",
};

export default function PrivacyPolicyPage() {
  return (
    <PrivacyPolicyViewLazy>
      <PrivacyPolicyBody />
    </PrivacyPolicyViewLazy>
  );
}
