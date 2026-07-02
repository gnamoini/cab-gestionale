"use server";

import { verifyClientLavorazioniAccessServer } from "@/src/lib/auth/client-lavorazioni-access-server";

export async function getMyClientLavorazioniAccessAction(): Promise<
  { ok: true; allowed: boolean } | { ok: false; message: string }
> {
  try {
    const allowed = await verifyClientLavorazioniAccessServer();
    return { ok: true, allowed };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Errore verifica accesso." };
  }
}
