import { NextResponse } from "next/server";
import { buildDashboardHealthScoreApiPayloadServer } from "@/lib/health-score/dashboard-health-score-api-payload.server";
import { verifyServerPageRead } from "@/src/lib/auth/server-permission-guards";

export const runtime = "nodejs";

export async function GET() {
  const allowed = await verifyServerPageRead("dashboard");
  if (!allowed) {
    return NextResponse.json({ error: "Permesso negato" }, { status: 403 });
  }

  try {
    const payload = await buildDashboardHealthScoreApiPayloadServer();
    return NextResponse.json(payload);
  } catch (e) {
    console.error("[health-score] compute failed", e);
    return NextResponse.json(
      { status: "FAILED", error: "Calcolo Health Score non riuscito" },
      { status: 500 },
    );
  }
}
