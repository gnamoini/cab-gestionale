import type { Metadata } from "next";
import { OfficialDocumentPreviewShell } from "@/components/documenti/official-document-preview-shell";
import { fetchPreventivoRecordServer } from "@/lib/preventivi/preventivi-fetch-server";
import { preventivoStatoLabel } from "@/lib/preventivi/preventivo-status-ui";
import { buildPageMetadata, formatPageTitle } from "@/lib/site/app-page-metadata";
import { notFound } from "next/navigation";

type PageProps = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const res = await fetchPreventivoRecordServer(id);
  if (!res.success || !res.data) return buildPageMetadata("Preventivo");
  const detail = res.data.numero?.trim() || res.data.cliente?.trim();
  return buildPageMetadata(
    detail ? formatPageTitle("Preventivo", detail) : "Preventivo",
    { description: "Anteprima documento preventivo" },
  );
}

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
