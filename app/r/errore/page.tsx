export { inventoryQrErrorePageMetadata as metadata } from "@/lib/site/app-page-metadata";

import Link from "next/link";
import { PageLayout } from "@/components/design-system";

const MESSAGES: Record<string, { title: string; body: string }> = {
  invalid: {
    title: "QR non valido",
    body: "Questa etichetta non è più valida. Richiedi una nuova etichetta in magazzino.",
  },
  inactive: {
    title: "Etichetta non attiva",
    body: "Questa etichetta QR non è più attiva. Richiedi una nuova etichetta.",
  },
  not_found: {
    title: "QR non trovato",
    body: "Questo identificativo non corrisponde a un ricambio nel sistema. Verifica l'etichetta.",
  },
  forbidden: {
    title: "Accesso non consentito",
    body: "Non hai permesso di accedere a questo ricambio. Se ritieni sia un errore, contatta l'officina.",
  },
};

export default async function InventoryQrErrorePage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>;
}) {
  const sp = await searchParams;
  const reason = sp.reason?.trim() || "not_found";
  const msg = MESSAGES[reason] ?? MESSAGES.not_found;

  return (
    <PageLayout title="QR ricambio">
      <div className="mx-auto flex max-w-lg flex-col gap-4 p-6">
        <h1 className="text-xl font-semibold text-[color:var(--cab-text)]">{msg.title}</h1>
        <p className="text-sm text-[color:var(--cab-text-muted)]">{msg.body}</p>
        <Link
          href="/magazzino"
          className="text-sm font-medium text-[color:var(--cab-primary)] underline-offset-2 hover:underline"
        >
          Vai al magazzino
        </Link>
      </div>
    </PageLayout>
  );
}
