export { loginPageMetadata as metadata } from "@/lib/site/app-page-metadata";

import { LoginFormLazy } from "@/components/public-surfaces/public-surface-loaders";

export default function LoginPage() {
  return <LoginFormLazy />;
}
