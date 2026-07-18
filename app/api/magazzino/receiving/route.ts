import { NextResponse } from "next/server";
import { INVENTORY_DOCUMENTS_COLUMNS } from "@/lib/db/table-select-columns";
import { verifyServerPageRead } from "@/src/lib/auth/server-permission-guards";
import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";

export const runtime = "nodejs";

export async function GET() {
  const canRead = await verifyServerPageRead("magazzino_carichi");
  if (!canRead) {
    return NextResponse.json({ error: "Permesso negato" }, { status: 403 });
  }

  const sb = await createSupabaseServerUserClient();
  const { data, error } = await sb
    .from("inventory_documents")
    .select(INVENTORY_DOCUMENTS_COLUMNS)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ documents: data ?? [] });
}
