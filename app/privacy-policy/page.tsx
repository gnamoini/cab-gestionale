import { PrivacyPolicyBody } from "@/components/legal/privacy-policy-body";
import { PrivacyPolicyViewLazy } from "@/components/public-surfaces/public-surface-loaders";

export { privacyPolicyPageMetadata as metadata } from "@/lib/site/app-page-metadata";

export default function PrivacyPolicyPage() {
  return (
    <PrivacyPolicyViewLazy>
      <PrivacyPolicyBody />
    </PrivacyPolicyViewLazy>
  );
}
