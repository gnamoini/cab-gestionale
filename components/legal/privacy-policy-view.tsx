"use client";

import type { ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { ShellNavBackButton } from "@/components/design-system/shell-nav-icon-button";
import { AuthStandalonePageShell } from "@/components/gestionale/auth-standalone-page";
import { sanitizePrivacyPolicyReturnPath } from "@/lib/legal/privacy-policy-return";

function PrivacyPolicyBackButtonInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const goBack = () => {
    const from = sanitizePrivacyPolicyReturnPath(searchParams.get("from"));
    if (from) {
      router.push(from);
      return;
    }
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }
    router.push("/login");
  };

  return <ShellNavBackButton onClick={goBack} />;
}

function PrivacyPolicyBackButton() {
  return (
    <Suspense
      fallback={
        <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center opacity-60" aria-hidden>
          <span className="sr-only">Indietro</span>
        </span>
      }
    >
      <PrivacyPolicyBackButtonInner />
    </Suspense>
  );
}

export type PrivacyPolicyViewProps = {
  children: ReactNode;
};

export function PrivacyPolicyView({ children }: PrivacyPolicyViewProps) {
  return (
    <AuthStandalonePageShell showThemeToggle={false} scrollable>
      <div className="relative z-10 mx-auto flex w-full min-w-0 max-w-7xl flex-col px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
        <div className="mb-4">
          <PrivacyPolicyBackButton />
        </div>
        {children}
      </div>
    </AuthStandalonePageShell>
  );
}
