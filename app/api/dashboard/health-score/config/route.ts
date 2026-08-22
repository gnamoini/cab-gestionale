import { NextResponse } from "next/server";
import {
  readHealthScoreCalculationSettingsServer,
  readHealthScoreConfigRowUpdatedAtServer,
  readHealthScoreTargetsServer,
  sanitizeHealthScoreTargetPatches,
  updateHealthScoreCalculationSettingsServer,
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
    const [targets, calculation, updatedAt] = await Promise.all([
      readHealthScoreTargetsServer(),
      readHealthScoreCalculationSettingsServer(),
      readHealthScoreConfigRowUpdatedAtServer(),
    ]);
    return NextResponse.json({ targets, calculation, updatedAt });
  } catch (e) {
    console.error("[health-score] config read failed", e);
    return NextResponse.json({ error: "Lettura configurazione non riuscita" }, { status: 500 });
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
  const rawCalculation =
    body && typeof body === "object" && "calculation" in body && body.calculation && typeof body.calculation === "object"
      ? (body.calculation as Record<string, unknown>)
      : null;

  if (!rawTargets && !rawCalculation) {
    return NextResponse.json({ error: "Campo targets o calculation mancante" }, { status: 400 });
  }

  try {
    let targets = rawTargets ? await readHealthScoreTargetsServer() : undefined;
    let calculation = rawCalculation ? await readHealthScoreCalculationSettingsServer() : undefined;

    if (rawTargets) {
      const patches = sanitizeHealthScoreTargetPatches(rawTargets);
      if (Object.keys(patches).length === 0) {
        return NextResponse.json({ error: "Nessun target valido da aggiornare" }, { status: 400 });
      }
      targets = await updateHealthScoreTargetsServer(patches);
    }

    if (rawCalculation) {
      const usePreventiviForMissingFatturazione = rawCalculation.usePreventiviForMissingFatturazione;
      if (typeof usePreventiviForMissingFatturazione !== "boolean") {
        return NextResponse.json({ error: "Campo calculation.usePreventiviForMissingFatturazione non valido" }, { status: 400 });
      }
      calculation = await updateHealthScoreCalculationSettingsServer({
        usePreventiviForMissingFatturazione,
      });
    }

    const updatedAt = await readHealthScoreConfigRowUpdatedAtServer();
    return NextResponse.json({ targets, calculation, updatedAt });
  } catch (e) {
    console.error("[health-score] config update failed", e);
    const message = e instanceof Error ? e.message : "Salvataggio configurazione non riuscito";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
