"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useMemo } from "react";
import { buildPrivacyPolicyHref } from "@/lib/legal/privacy-policy-return";
import { dsBtnGhost, dsFocus } from "@/lib/ui/design-system";

const privacyPolicyLinkClass = `${dsBtnGhost} ${dsFocus} min-h-[1.75rem] px-2 py-1 text-[10px] sm:text-xs`;

/** Footer profilo / drawer account — versione e link legali. */
export const profileFooterActionClass = privacyPolicyLinkClass;

function PrivacyPolicyLinkInner({
  className = "",
  returnPath,
}: {
  className?: string;
  returnPath?: string;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const href = useMemo(() => {
    if (returnPath) return buildPrivacyPolicyHref(returnPath);
    const qs = searchParams.toString();
    const current = pathname ? (qs ? `${pathname}?${qs}` : pathname) : "/login";
    return buildPrivacyPolicyHref(current);
  }, [pathname, returnPath, searchParams]);

  return (
    <Link href={href} className={`${privacyPolicyLinkClass} ${className}`.trim()}>
      Privacy Policy
    </Link>
  );
}

export function PrivacyPolicyLink(props: { className?: string; returnPath?: string }) {
  return (
    <Suspense
      fallback={
        <span className={`${privacyPolicyLinkClass} ${props.className ?? ""}`.trim()} aria-hidden>
          Privacy Policy
        </span>
      }
    >
      <PrivacyPolicyLinkInner {...props} />
    </Suspense>
  );
}
