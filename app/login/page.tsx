import { Suspense } from "react";
import { LoginForm } from "./login-form";

function LoginFallback() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-[var(--cab-bg-app)] px-4 text-sm text-[color:var(--cab-text-muted)]">
      Caricamento…
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
