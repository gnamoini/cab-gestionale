import type { Metadata } from "next";
import { TermsAndConditionsBody } from "@/components/legal/terms-and-conditions-body";
import { TermsAndConditionsViewLazy } from "@/components/public-surfaces/public-surface-loaders";

export const metadata: Metadata = {
  title: "Termini e condizioni | CAB Gestionale Officina",
  description:
    "Termini e condizioni di utilizzo dell'area riservata CAB Gestionale Officina di Centro Assistenza Bari SRL.",
};

export default function TermsAndConditionsPage() {
  return (
    <TermsAndConditionsViewLazy>
      <TermsAndConditionsBody />
    </TermsAndConditionsViewLazy>
  );
}
