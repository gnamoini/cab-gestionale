import "server-only";

import { cache } from "react";
import { DOCUMENT_ACCESS_TOKENS_COLUMNS } from "@/lib/db/table-select-columns";
import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";
import type { DocumentAccessTokenRow } from "@/src/types/supabase-tables";

/** Token documento ufficiale — condiviso tra page e generateMetadata. */
export const fetchDocumentAccessTokenServer = cache(
  async (token: string): Promise<DocumentAccessTokenRow | null> => {
    const trimmed = token.trim();
    if (!trimmed) return null;
    const sb = await createSupabaseServerUserClient();
    const { data } = await sb
      .from("document_access_tokens")
      .select(DOCUMENT_ACCESS_TOKENS_COLUMNS)
      .eq("token", trimmed)
      .is("revoked_at", null)
      .maybeSingle();
    return (data as DocumentAccessTokenRow | null) ?? null;
  },
);
