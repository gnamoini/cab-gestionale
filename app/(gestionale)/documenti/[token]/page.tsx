import { OfficialDocumentPreviewShell } from "@/components/documenti/official-document-preview-shell";
import { DOCUMENT_ACCESS_TOKENS_COLUMNS } from "@/lib/db/table-select-columns";
import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";
import type { DocumentAccessTokenRow } from "@/src/types/supabase-tables";
import { notFound } from "next/navigation";

type PageProps = { params: Promise<{ token: string }> };

export default async function ClientOfficialDocumentTokenPage({ params }: PageProps) {
  const { token } = await params;
  const sb = await createSupabaseServerUserClient();
  const { data } = await sb
    .from("document_access_tokens")
    .select(DOCUMENT_ACCESS_TOKENS_COLUMNS)
    .eq("token", token)
    .is("revoked_at", null)
    .maybeSingle();

  if (!data) notFound();
  const row = data as DocumentAccessTokenRow;
  const title = row.entity_type === "preventivo" ? "Preventivo" : "DDT";

  return (
    <OfficialDocumentPreviewShell
      title={title}
      streamUrl={`/api/official-documents/token/${encodeURIComponent(token)}/stream`}
    />
  );
}
