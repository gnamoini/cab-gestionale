import type { Metadata } from "next";
import { OfficialDocumentPreviewShell } from "@/components/documenti/official-document-preview-shell";
import { fetchDdtDetailServer } from "@/lib/ddt/ddt-fetch-server";
import { buildPageMetadata, formatPageTitle } from "@/lib/site/app-page-metadata";
import { notFound } from "next/navigation";

type PageProps = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const detail = await fetchDdtDetailServer(id);
  if (!detail) return buildPageMetadata("DDT");
  const d = detail.document;
  const label =
    d.numero != null ? String(d.numero) : d.cliente_label?.trim() || undefined;
  return buildPageMetadata(label ? formatPageTitle("DDT", label) : "DDT", {
    description: "Anteprima documento di trasporto",
  });
}

export default async function DdtOfficialPreviewPage({ params }: PageProps) {
  const { id } = await params;
  const detail = await fetchDdtDetailServer(id);
  if (!detail) notFound();

  const d = detail.document;
  return (
    <OfficialDocumentPreviewShell
      title={d.numero != null ? `DDT ${d.numero}` : "DDT"}
      subtitle={d.cliente_label}
      streamUrl={`/api/official-documents/ddt/${encodeURIComponent(id)}/stream`}
    />
  );
}
