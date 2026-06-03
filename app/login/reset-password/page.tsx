import { Suspense } from "react";
import { LoadingLoginSkeleton } from "@/components/design-system";
import { ResetPasswordForm } from "./reset-password-form";

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<LoadingLoginSkeleton />}>
      <ResetPasswordForm />
    </Suspense>
  );
}
