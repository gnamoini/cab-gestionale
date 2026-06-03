import { Suspense } from "react";
import { LoadingLoginSkeleton } from "@/components/design-system";
import { LoginForm } from "./login-form";

function LoginFallback() {
  return <LoadingLoginSkeleton />;
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginForm />
    </Suspense>
  );
}
