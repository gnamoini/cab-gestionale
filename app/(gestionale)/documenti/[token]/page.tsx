import type { Metadata } from "next";
import { OfficialDocumentPreviewShell } from "@/components/documenti/official-document-preview-shell";
import { fetchDocumentAccessTokenServer } from "@/lib/documenti/document-access-token-fetch.server";
import { buildPageMetadata } from "@/lib/site/app-page-metadata";
import { notFound } from "next/navigation";

type PageProps = { params: Promise<{ token: string }> };

function documentTokenPageTitle(entityType: string): string {
  return entityType === "preventivo" ? "Preventivo" : "DDT";
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { token } = await params;
  const row = await fetchDocumentAccessTokenServer(token);
  if (!row) return buildPageMetadata("Documento");
  return buildPageMetadata(documentTokenPageTitle(row.entity_type), {
    description: "Documento ufficiale condiviso",
  });
}

export default async function ClientOfficialDocumentTokenPage({ params }: PageProps) {
  const { token } = await params;
  const row = await fetchDocumentAccessTokenServer(token);
  if (!row) notFound();

  const title = documentTokenPageTitle(row.entity_type);

  return (
    <OfficialDocumentPreviewShell
      title={title}
      streamUrl={`/api/official-documents/token/${encodeURIComponent(token)}/stream`}
    />
  );
}
