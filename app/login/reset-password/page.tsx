import { Suspense } from "react";
import { LoginPageStructure } from "@/components/auth/login-page-structure";
import { ResetPasswordFormLazy } from "@/components/public-surfaces/public-surface-loaders";

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<LoginPageStructure mode="skeleton" />}>
      <ResetPasswordFormLazy />
    </Suspense>
  );
}
