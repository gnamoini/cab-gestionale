import { NextResponse } from "next/server";
import { deleteGeneratedListinoRicambi } from "@/lib/magazzino/listino-import/listino-import-delete-generated.server";
import { getServerSession } from "@/src/lib/auth/get-server-session";
import {
  verifyServerPermission,
  verifyServerSectionRead,
  verifyServerSectionWrite,
} from "@/src/lib/auth/server-permission-guards";

export const runtime = "nodejs";

export async function DELETE() {
  const canDelete = await verifyServerPermission("deleteRecords");
  const canWriteMagazzino = await verifyServerSectionWrite("magazzino");
  if (!canDelete || !canWriteMagazzino) {
    return NextResponse.json({ error: "Permesso negato" }, { status: 403 });
  }

  const session = await getServerSession();
  if (!session.user?.id) {
    return NextResponse.json({ error: "Sessione non valida" }, { status: 401 });
  }

  try {
    const result = await deleteGeneratedListinoRicambi();
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Eliminazione non riuscita.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function GET() {
  const canRead = await verifyServerSectionRead("magazzino");
  if (!canRead) {
    return NextResponse.json({ error: "Permesso negato" }, { status: 403 });
  }

  const { countGeneratedListinoRicambi } = await import(
    "@/lib/magazzino/listino-import/listino-import-preview.server"
  );

  try {
    const count = await countGeneratedListinoRicambi();
    return NextResponse.json({ count });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Conteggio non riuscito.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
