import { NextResponse } from "next/server";
import { recoverImportBatch } from "@/lib/data-import/core/import-recovery.server";
import { requireImportSession } from "@/lib/data-import/core/import-api-auth.server";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Params) {
  const auth = await requireImportSession();
  if (!auth.ok) return NextResponse.json({ error: auth.response.error }, { status: auth.response.status });

  const { id } = await params;
  try {
    const result = await recoverImportBatch(id, auth.userId);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Recovery non riuscita" }, { status: 400 });
  }
}
