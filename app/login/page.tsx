import { Suspense } from "react";
import { LoginPageStructure } from "@/components/auth/login-page-structure";
import { LoginFormLazy } from "@/components/public-surfaces/public-surface-loaders";

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginPageStructure mode="skeleton" />}>
      <LoginFormLazy />
    </Suspense>
  );
}
