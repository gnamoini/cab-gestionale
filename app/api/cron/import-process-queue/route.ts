import { NextResponse } from "next/server";
import { readSupabaseServiceRoleKey } from "@/lib/env/supabase-service-role";
import { processImportQueue } from "@/lib/import-core/import-worker.server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const serviceKey = readSupabaseServiceRoleKey();
  const auth = request.headers.get("authorization");
  if (!serviceKey || auth !== `Bearer ${serviceKey}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await processImportQueue();
  return NextResponse.json(result);
}
