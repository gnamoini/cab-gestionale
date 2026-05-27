import { Suspense } from "react";
import { GlobalLoadingPageFallback } from "@/components/design-system";
import { LoginForm } from "./login-form";

function LoginFallback() {
  return (
    <div className="relative isolate min-h-dvh overflow-hidden bg-[var(--cab-bg-app)]">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_60%_at_50%_-15%,color-mix(in_srgb,var(--cab-primary)_20%,transparent),transparent_55%),linear-gradient(180deg,var(--cab-bg-app),color-mix(in_srgb,var(--cab-surface-2)_40%,var(--cab-bg-app)))]"
        aria-hidden
      />
      <GlobalLoadingPageFallback />
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginForm />
    </Suspense>
  );
}
