import { OfficialDocumentPreviewShell } from "@/components/documenti/official-document-preview-shell";
import { fetchPreventivoRecordServer } from "@/lib/preventivi/preventivi-fetch-server";
import { preventivoStatoLabel } from "@/lib/preventivi/preventivo-status-ui";
import { notFound } from "next/navigation";

type PageProps = { params: Promise<{ id: string }> };

export default async function PreventivoOfficialPreviewPage({ params }: PageProps) {
  const { id } = await params;
  const res = await fetchPreventivoRecordServer(id);
  if (!res.success || !res.data) notFound();

  const p = res.data;
  return (
    <OfficialDocumentPreviewShell
      title={`Preventivo ${p.numero || id}`}
      subtitle={`${p.cliente || "—"} · ${preventivoStatoLabel(p.stato)}`}
      streamUrl={`/api/official-documents/preventivo/${encodeURIComponent(id)}/stream`}
    />
  );
}
