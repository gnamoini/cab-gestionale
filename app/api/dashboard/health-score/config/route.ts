import { NextResponse } from "next/server";
import {
  readHealthScoreConfigRowUpdatedAtServer,
  readHealthScoreTargetsServer,
  sanitizeHealthScoreTargetPatches,
  updateHealthScoreTargetsServer,
} from "@/lib/health-score/config/save-targets.server";
import {
  verifyServerPageRead,
  verifyServerPageWrite,
} from "@/src/lib/auth/server-permission-guards";

export const runtime = "nodejs";

export async function GET() {
  const allowed = await verifyServerPageRead("dashboard");
  if (!allowed) {
    return NextResponse.json({ error: "Permesso negato" }, { status: 403 });
  }

  try {
    const [targets, updatedAt] = await Promise.all([
      readHealthScoreTargetsServer(),
      readHealthScoreConfigRowUpdatedAtServer(),
    ]);
    return NextResponse.json({ targets, updatedAt });
  } catch (e) {
    console.error("[health-score] config read failed", e);
    return NextResponse.json({ error: "Lettura target non riuscita" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const allowed = await verifyServerPageWrite("impostazioni");
  if (!allowed) {
    return NextResponse.json({ error: "Permesso negato" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corpo richiesta non valido" }, { status: 400 });
  }

  const rawTargets =
    body && typeof body === "object" && "targets" in body && body.targets && typeof body.targets === "object"
      ? (body.targets as Record<string, unknown>)
      : null;
  if (!rawTargets) {
    return NextResponse.json({ error: "Campo targets mancante" }, { status: 400 });
  }

  const patches = sanitizeHealthScoreTargetPatches(rawTargets);
  if (Object.keys(patches).length === 0) {
    return NextResponse.json({ error: "Nessun target valido" }, { status: 400 });
  }

  try {
    const targets = await updateHealthScoreTargetsServer(patches);
    const updatedAt = await readHealthScoreConfigRowUpdatedAtServer();
    return NextResponse.json({ targets, updatedAt });
  } catch (e) {
    console.error("[health-score] config update failed", e);
    const message = e instanceof Error ? e.message : "Salvataggio target non riuscito";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
