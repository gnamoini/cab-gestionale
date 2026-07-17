import { NextResponse } from "next/server";
import { syncRuntimeConfigToDatabase } from "@/lib/ai/runtime/sync-runtime-config";

export const runtime = "nodejs";
export const maxDuration = 60;

function isCronAuthorized(request: Request): boolean {
  const auth = request.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return false;
  const cronSecret = process.env.CRON_SECRET?.trim();
  return Boolean(cronSecret && auth === `Bearer ${cronSecret}`);
}

/** Vercel Cron: sync env bootstrap → ai_provider_keys (every 5–10 min). */
export async function GET(request: Request) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await syncRuntimeConfigToDatabase();
    return NextResponse.json({
      ok: true,
      syncConfidence: result.syncConfidence,
      created: result.created,
      updated: result.updated,
      disabled: result.disabled,
      warnings: result.warnings,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "sync failed",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  return GET(request);
}
