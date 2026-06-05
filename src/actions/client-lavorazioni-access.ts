"use server";

import { hasPermission } from "@/lib/auth/rbac";
import { verifyClientLavorazioniAccessServer } from "@/src/lib/auth/client-lavorazioni-access-server";
import { assertAdminCaller, listUsersByAdminAction, type SecurityUserAdminRow } from "@/src/actions/admin-users";
import { validateSetClientLavorazioniAccessInput } from "@/lib/validation/security-actions-validation";

export type ClientLavorazioniAccessRow = SecurityUserAdminRow & {
  enabled: boolean;
};

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

export async function listClientLavorazioniAccessByAdminAction(): Promise<
  { ok: true; rows: ClientLavorazioniAccessRow[] } | { ok: false; message: string }
> {
  const admin = await assertAdminCaller();
  if (!admin.ok) return { ok: false, message: admin.message };

  const usersRes = await listUsersByAdminAction();
  if (!usersRes.ok) return { ok: false, message: usersRes.message };

  const rows: ClientLavorazioniAccessRow[] = usersRes.users.map((u) => ({
    ...u,
    enabled: hasPermission(u.ruolo, "viewClientLavorazioni"),
  }));

  return { ok: true, rows };
}

export async function setClientLavorazioniAccessByAdminAction(input: {
  userId: string;
  enabled: boolean;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const parsed = validateSetClientLavorazioniAccessInput(input);
  if (!parsed.ok) return { ok: false, message: parsed.message };

  const admin = await assertAdminCaller();
  if (!admin.ok) return { ok: false, message: admin.message };

  return {
    ok: false,
    message: "L'accesso al portale clienti è determinato solo dal ruolo (admin o cliente).",
  };
}
