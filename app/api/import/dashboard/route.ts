import { NextResponse } from "next/server";
import { loadImportDashboardStats } from "@/lib/import-core/import-dashboard.server";
import { verifyServerPageRead } from "@/src/lib/auth/server-permission-guards";

export const runtime = "nodejs";

export async function GET() {
  const canRead = await verifyServerPageRead("impostazioni");
  if (!canRead) return NextResponse.json({ error: "Permesso negato" }, { status: 403 });

  try {
    const stats = await loadImportDashboardStats();
    return NextResponse.json(stats);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Errore dashboard import" },
      { status: 400 },
    );
  }
}
