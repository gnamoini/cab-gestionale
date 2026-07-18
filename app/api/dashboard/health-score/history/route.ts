import { NextResponse } from "next/server";
import { runHealthScoreWeeklyHistoryServer } from "@/lib/health-score/engine/run-health-score-weekly-history.server";
import { verifyServerPageRead } from "@/src/lib/auth/server-permission-guards";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const allowed = await verifyServerPageRead("dashboard");
  if (!allowed) {
    return NextResponse.json({ error: "Permesso negato" }, { status: 403 });
  }

  const url = new URL(req.url);
  const weeksParam = Number(url.searchParams.get("weeks") ?? "26");
  const weeks = Number.isFinite(weeksParam) ? Math.max(1, Math.min(weeksParam, 52)) : 26;

  try {
    const points = await runHealthScoreWeeklyHistoryServer(weeks);
    return NextResponse.json({
      points,
      meta: {
        weeks,
        computedAt: new Date().toISOString(),
      },
    });
  } catch (e) {
    console.error("[health-score] history compute failed", e);
    return NextResponse.json(
      { error: "Calcolo storico Health Score non riuscito" },
      { status: 500 },
    );
  }
}
