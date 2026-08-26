import { TermsAndConditionsBody } from "@/components/legal/terms-and-conditions-body";
import { TermsAndConditionsViewLazy } from "@/components/public-surfaces/public-surface-loaders";

export { terminiECondizioniPageMetadata as metadata } from "@/lib/site/app-page-metadata";

export default function TermsAndConditionsPage() {
  return (
    <TermsAndConditionsViewLazy>
      <TermsAndConditionsBody />
    </TermsAndConditionsViewLazy>
  );
}
