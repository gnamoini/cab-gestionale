import { OfficialDocumentPreviewShell } from "@/components/documenti/official-document-preview-shell";
import { fetchDdtDetailServer } from "@/lib/ddt/ddt-fetch-server";
import { notFound } from "next/navigation";

type PageProps = { params: Promise<{ id: string }> };

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
