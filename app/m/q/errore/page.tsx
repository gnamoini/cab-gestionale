export { mezzoQrErrorePageMetadata as metadata } from "@/lib/site/app-page-metadata";

import Link from "next/link";
import { PageLayout } from "@/components/design-system";

const MESSAGES: Record<string, { title: string; body: string }> = {
  invalid: {
    title: "QR non valido",
    body: "Questo identificativo non è più associato a un mezzo attivo. Contattare l'officina.",
  },
  inactive: {
    title: "QR non valido",
    body: "Questo identificativo non è più associato a un mezzo attivo. Contattare l'officina.",
  },
  not_found: {
    title: "QR non valido",
    body: "Questo identificativo non è più associato a un mezzo attivo. Contattare l'officina.",
  },
  forbidden: {
    title: "Accesso non consentito",
    body: "Non hai permesso di accedere a questo mezzo. Se ritieni sia un errore, contatta l'officina.",
  },
};

export default async function MezzoQrErrorePage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>;
}) {
  const sp = await searchParams;
  const reason = sp.reason?.trim() || "not_found";
  const msg = MESSAGES[reason] ?? MESSAGES.not_found;

  return (
    <PageLayout title="QR non valido">
      <div className="mx-auto flex max-w-lg flex-col gap-4 p-6">
        <h1 className="text-xl font-semibold text-[color:var(--cab-text)]">{msg.title}</h1>
        <p className="text-sm text-[color:var(--cab-text-muted)]">{msg.body}</p>
        <Link
          href="/dashboard"
          className="text-sm font-medium text-[color:var(--cab-primary)] underline-offset-2 hover:underline"
        >
          Torna alla dashboard
        </Link>
      </div>
    </PageLayout>
  );
}
