import { NextResponse } from "next/server";
import { listInventoryReceivingPending } from "@/lib/inventory-receiving/documents/inventory-receiving-pending.server";
import { getServerSession } from "@/src/lib/auth/get-server-session";
import { verifyServerPageRead } from "@/src/lib/auth/server-permission-guards";

export const runtime = "nodejs";

export async function GET() {
  const canRead = await verifyServerPageRead("magazzino_carichi");
  if (!canRead) {
    return NextResponse.json({ error: "Permesso negato" }, { status: 403 });
  }

  const session = await getServerSession();
  const userId = session.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Sessione non valida" }, { status: 401 });
  }

  const pending = await listInventoryReceivingPending(userId);
  return NextResponse.json({ pending });
}
