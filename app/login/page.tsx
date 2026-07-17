import { Suspense } from "react";
import { LoadingLoginSkeleton } from "@/components/design-system";
import { LoginFormLazy } from "@/components/public-surfaces/public-surface-loaders";

function LoginFallback() {
  return <LoadingLoginSkeleton />;
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginFormLazy />
    </Suspense>
  );
}
