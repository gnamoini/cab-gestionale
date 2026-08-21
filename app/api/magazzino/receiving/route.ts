import { NextResponse } from "next/server";
import { fetchInventoryReceivingDocumentsServer } from "@/lib/inventory-receiving/inventory-receiving-list-fetch.server";

export const runtime = "nodejs";

export async function GET() {
  const res = await fetchInventoryReceivingDocumentsServer();
  if (!res.success) {
    const status = res.error === "Permesso negato." ? 403 : 400;
    return NextResponse.json({ error: res.error }, { status });
  }
  return NextResponse.json({ documents: res.data ?? [] });
}
