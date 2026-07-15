"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { ShellNavBackButton } from "@/components/design-system/shell-nav-icon-button";
import {
  AuthStandaloneCardHeader,
  AuthStandalonePageShell,
} from "@/components/gestionale/auth-standalone-page";
import { AUTH_STANDALONE_LOGO_SUBTITLE } from "@/components/gestionale/cab-logo";
import { reportSectionGroupTitleClass } from "@/components/report/report-ui-tokens";
import {
  PRIVACY_POLICY_LAST_UPDATED,
  privacyPolicyIntro,
  privacyPolicySections,
} from "@/lib/legal/privacy-policy-content";
import { sanitizePrivacyPolicyReturnPath } from "@/lib/legal/privacy-policy-return";
import { dsFocus, dsTypoCaption, dsTypoPageTitle } from "@/lib/ui/design-system";

const privacyPolicyCardClass =
  "mx-auto w-full min-w-0 max-w-full shrink-0 rounded-[var(--ds-radius-xl)] border border-[color:color-mix(in_srgb,var(--cab-border)_70%,var(--cab-border-strong))] bg-[var(--cab-card)] p-6 shadow-[var(--cab-shadow-md)] ring-1 ring-[color:color-mix(in_srgb,var(--cab-border)_45%,transparent)] sm:p-8 lg:p-10";

const tocLinkClass = `${dsFocus} block rounded-md px-2 py-1.5 text-xs leading-snug text-[color:var(--cab-text-muted)] transition-colors hover:bg-[var(--cab-hover)] hover:text-[color:var(--cab-text)]`;

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

function PrivacyPolicyToc({ className = "" }: { className?: string }) {
  return (
    <nav aria-label="Indice sezioni" className={className}>
      <p className={`${reportSectionGroupTitleClass} mb-2`}>Indice</p>
      <ol className="space-y-0.5">
        {privacyPolicySections.map((section) => (
          <li key={section.id}>
            <Link href={`#${section.id}`} className={tocLinkClass}>
              {section.title}
            </Link>
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function PrivacyPolicyView() {
  return (
    <AuthStandalonePageShell showThemeToggle={false} scrollable>
      <div className="relative z-10 mx-auto flex w-full min-w-0 max-w-7xl flex-col px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
        <div className="mb-4">
          <PrivacyPolicyBackButton />
        </div>
        <article className={privacyPolicyCardClass}>
          <AuthStandaloneCardHeader
            srOnlyTitle="Privacy Policy"
            productLabel={AUTH_STANDALONE_LOGO_SUBTITLE}
          />

          <header className="mb-6 border-b border-[color:var(--cab-border)] pb-5 text-center">
            <h1 className={dsTypoPageTitle}>Privacy Policy</h1>
            <p className={`${dsTypoCaption} mt-2`}>
              <strong>Ultimo aggiornamento:</strong> {PRIVACY_POLICY_LAST_UPDATED}
            </p>
          </header>

          <div className="mb-6 space-y-4 border-b border-[color:var(--cab-border)] pb-6">{privacyPolicyIntro}</div>

          <div className="lg:hidden">
            <PrivacyPolicyToc className="mb-6 rounded-[var(--ds-radius-lg)] border border-[color:var(--cab-border)] bg-[color:color-mix(in_srgb,var(--cab-surface-2)_45%,var(--cab-card))] p-4" />
          </div>

          <div className="lg:grid lg:grid-cols-[minmax(12rem,16rem)_1fr] lg:gap-10 xl:grid-cols-[minmax(14rem,18rem)_1fr]">
            <PrivacyPolicyToc className="hidden lg:sticky lg:top-24 lg:block lg:self-start" />

            <div className="min-w-0 space-y-8">
              {privacyPolicySections.map((section) => (
                <section
                  key={section.id}
                  id={section.id}
                  className="scroll-mt-28 border-t border-[color:var(--cab-border)] pt-6 first:border-t-0 first:pt-0"
                  aria-labelledby={`${section.id}-title`}
                >
                  <h2 id={`${section.id}-title`} className={`${reportSectionGroupTitleClass} mb-4 normal-case`}>
                    {section.title}
                  </h2>
                  <div className="space-y-3">{section.body}</div>
                </section>
              ))}
            </div>
          </div>
        </article>
      </div>
    </AuthStandalonePageShell>
  );
}
