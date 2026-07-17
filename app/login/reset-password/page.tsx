import { Suspense } from "react";
import { LoadingLoginSkeleton } from "@/components/design-system";
import { ResetPasswordFormLazy } from "@/components/public-surfaces/public-surface-loaders";

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<LoadingLoginSkeleton />}>
      <ResetPasswordFormLazy />
    </Suspense>
  );
}
