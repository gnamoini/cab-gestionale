import "server-only";

import { NextResponse } from "next/server";
import {
  CompanyNotConfiguredError,
  requireCompanyIdForUser,
} from "@/lib/document-capture/company-id.server";
import {
  verifyServerModuleCan,
  verifyServerPageWrite,
} from "@/src/lib/auth/server-permission-guards";
import { resolveServerEffectivePermissions } from "@/src/lib/runtime/truth-layer/resolve-effective-permissions.server";

export async function requireDocumentCaptureAuth(
  op: "read" | "write",
  extra?: { editWorkOrders?: boolean; requireTenant?: boolean },
): Promise<NextResponse | null> {
  const snap = await resolveServerEffectivePermissions();
  if (!snap) {
    return NextResponse.json({ error: "Non autenticato", code: "UNAUTHORIZED" }, { status: 401 });
  }

  const allowed = await verifyServerModuleCan("document_capture", op);
  if (!allowed) {
    return NextResponse.json({ error: "Permesso richiesto" }, { status: 403 });
  }

  if (extra?.editWorkOrders && !(await verifyServerPageWrite("lavorazioni"))) {
    return NextResponse.json({ error: "Permesso lavorazioni richiesto" }, { status: 403 });
  }

  if (extra?.requireTenant !== false && op === "write") {
    try {
      await requireCompanyIdForUser();
    } catch (e) {
      if (e instanceof CompanyNotConfiguredError) {
        return NextResponse.json({ error: e.message, code: "TENANT_MISSING" }, { status: 403 });
      }
      throw e;
    }
  }

  return null;
}

export function readIdempotencyKey(request: Request): string | null {
  const key = request.headers.get("Idempotency-Key")?.trim();
  return key && key.length <= 128 ? key : null;
}
