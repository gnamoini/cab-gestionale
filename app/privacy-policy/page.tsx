import type { Metadata } from "next";
import { PrivacyPolicyView } from "@/components/legal/privacy-policy-view";

export const metadata: Metadata = {
  title: "Informativa privacy | CAB Gestionale Officina",
  description:
    "Informativa sul trattamento dei dati personali ai sensi del GDPR per l'area riservata CAB Gestionale Officina.",
};

export default function PrivacyPolicyPage() {
  return <PrivacyPolicyView />;
}
