"use client";

import type { ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { ShellNavBackButton } from "@/components/design-system/shell-nav-icon-button";
import { AuthStandalonePageShell } from "@/components/gestionale/auth-standalone-page";
import { sanitizeTermsAndConditionsReturnPath } from "@/lib/legal/terms-and-conditions-return";

function TermsAndConditionsBackButtonInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const goBack = () => {
    const from = sanitizeTermsAndConditionsReturnPath(searchParams.get("from"));
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

function TermsAndConditionsBackButton() {
  return (
    <Suspense
      fallback={
        <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center opacity-60" aria-hidden>
          <span className="sr-only">Indietro</span>
        </span>
      }
    >
      <TermsAndConditionsBackButtonInner />
    </Suspense>
  );
}

export type TermsAndConditionsViewProps = {
  children: ReactNode;
};

export function TermsAndConditionsView({ children }: TermsAndConditionsViewProps) {
  return (
    <AuthStandalonePageShell showThemeToggle={false} scrollable>
      <div className="relative z-10 mx-auto flex w-full min-w-0 max-w-7xl flex-col px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
        <div className="mb-4">
          <TermsAndConditionsBackButton />
        </div>
        {children}
      </div>
    </AuthStandalonePageShell>
  );
}
