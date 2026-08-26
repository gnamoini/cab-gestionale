export { loginResetPasswordPageMetadata as metadata } from "@/lib/site/app-page-metadata";

import { ResetPasswordFormLazy } from "@/components/public-surfaces/public-surface-loaders";

export default function ResetPasswordPage() {
  return <ResetPasswordFormLazy />;
}
