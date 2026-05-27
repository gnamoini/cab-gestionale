import { Suspense } from "react";
import { GlobalLoadingPageFallback } from "@/components/design-system";
import { LoginForm } from "./login-form";

function LoginFallback() {
  return (
    <div className="relative isolate min-h-dvh overflow-hidden bg-[var(--cab-bg-app)]">
      <div
        className="pointer-events-none absolute inset-0 bg-[var(--cab-bg-app)]"
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
