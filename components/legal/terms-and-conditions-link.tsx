"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useMemo } from "react";
import { buildTermsAndConditionsHref } from "@/lib/legal/terms-and-conditions-return";
import { dsBtnGhost, dsFocus } from "@/lib/ui/design-system";

const termsLinkClass = `${dsBtnGhost} ${dsFocus} min-h-[1.75rem] px-2 py-1 text-[10px] sm:text-xs`;

function TermsAndConditionsLinkInner({
  className = "",
  returnPath,
}: {
  className?: string;
  returnPath?: string;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const href = useMemo(() => {
    if (returnPath) return buildTermsAndConditionsHref(returnPath);
    const qs = searchParams.toString();
    const current = pathname ? (qs ? `${pathname}?${qs}` : pathname) : "/login";
    return buildTermsAndConditionsHref(current);
  }, [pathname, returnPath, searchParams]);

  return (
    <Link href={href} className={`${termsLinkClass} ${className}`.trim()}>
      Termini e condizioni
    </Link>
  );
}

export function TermsAndConditionsLink(props: { className?: string; returnPath?: string }) {
  return (
    <Suspense
      fallback={
        <span className={`${termsLinkClass} ${props.className ?? ""}`.trim()} aria-hidden>
          Termini e condizioni
        </span>
      }
    >
      <TermsAndConditionsLinkInner {...props} />
    </Suspense>
  );
}
