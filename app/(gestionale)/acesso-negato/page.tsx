export { accessoNegatoPageMetadata as metadata } from "@/lib/site/app-page-metadata";

import Link from "next/link";
import { sanitizePostLoginRequestedPath } from "@/lib/auth/resolve-post-login-redirect";
import { dsBtnNeutral } from "@/lib/ui/design-system";

export default function AccessoNegatoPage({
  searchParams,
}: {
  searchParams?: { from?: string };
}) {
  const rawFrom = typeof searchParams?.from === "string" ? searchParams.from : null;
  const from = sanitizePostLoginRequestedPath(rawFrom) ?? "/";

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      <div className="max-w-lg rounded-2xl border border-[color:var(--cab-border)] bg-[var(--cab-card)] px-8 py-10 shadow-sm">
        <h1 className="text-xl font-semibold text-[color:var(--cab-text)]">Accesso negato</h1>
        <p className="mt-3 text-sm leading-relaxed text-[color:var(--cab-text-muted)]">
          Non hai i permessi necessari per aprire questa pagina. Se pensi si tratti di un errore, contatta un
          amministratore.
        </p>
        <Link href={from} className={`mt-6 inline-flex ${dsBtnNeutral}`}>
          Torna indietro
        </Link>
      </div>
    </div>
  );
}
