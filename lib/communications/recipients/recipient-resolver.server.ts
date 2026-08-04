import type { SupabaseClient } from "@supabase/supabase-js";
import type { CommunicationPolicyDefinition } from "@/lib/communications/policy/communication-policy-catalog";
import { parseOrdineFornitoreFornitoreSnapshot } from "@/lib/ordini-fornitori/fornitore-snapshot";
import { buildClienteEntityKey } from "@/lib/validation/entity-keys";
import { readOfficinaDestinatarioOrdiniFromRows } from "@/lib/officina/officina-destinatario-ordini";
import { formatOfficinaSede, readOfficinaSedeOperativaFromRows } from "@/lib/officina/officina-sede";
import { isValidEmail } from "@/lib/validation/email";
import type { AppSettingRow } from "@/src/types/supabase-tables";

export type ResolvedRecipient = {
  email: string;
  name: string;
  clienteId: string | null;
};

function pickClienteEmail(contatti: Array<{ tipo: string; valore: string }>): string {
  for (const c of contatti) {
    if (c.tipo === "email" && isValidEmail(c.valore)) return c.valore.trim();
  }
  for (const c of contatti) {
    if (c.tipo === "pec" && isValidEmail(c.valore)) return c.valore.trim();
  }
  return "";
}

async function resolveClienteByLabel(
  client: SupabaseClient,
  clienteLabel: string,
): Promise<ResolvedRecipient | null> {
  const label = clienteLabel.trim();
  if (!label) return null;

  type ClienteRow = { id: string; nome_display: string; ragione_sociale: string | null };
  const entityKey = buildClienteEntityKey(label);
  let row: ClienteRow | null = null;

  if (entityKey) {
    const { data } = await client
      .from("clienti_anagrafiche")
      .select("id, nome_display, ragione_sociale")
      .eq("entity_key", entityKey)
      .maybeSingle();
    if (data) row = data as ClienteRow;
  }

  if (!row) {
    const { data } = await client
      .from("clienti_anagrafiche")
      .select("id, nome_display, ragione_sociale")
      .eq("nome_display", label)
      .maybeSingle();
    if (data) row = data as ClienteRow;
  }

  if (!row) return null;

  const { data: contatti } = await client
    .from("clienti_contatti")
    .select("tipo, valore")
    .eq("cliente_id", row.id)
    .order("ordine");

  const email = pickClienteEmail((contatti ?? []) as Array<{ tipo: string; valore: string }>);
  const name =
    (typeof row.ragione_sociale === "string" && row.ragione_sociale.trim()) ||
    (typeof row.nome_display === "string" && row.nome_display.trim()) ||
    label;

  return { email, name, clienteId: row.id as string };
}

function resolveSupplierEmailFromSnapshot(snapshot: Record<string, unknown>): string {
  const email = snapshot.email ?? snapshot.email_fornitore;
  if (typeof email === "string" && isValidEmail(email)) return email.trim();
  return "";
}

export async function resolveRecipientForPolicy(
  client: SupabaseClient,
  policy: CommunicationPolicyDefinition,
  entityType: string,
  entityId: string,
  payload: Record<string, unknown>,
  settingsRows: AppSettingRow[],
): Promise<ResolvedRecipient | null> {
  if (policy.recipientType === "supplier") {
    if (entityType !== "ordini_fornitori") return null;
    const { data: ordine } = await client
      .from("ordini_fornitori")
      .select("fornitore_label, fornitore_snapshot, dettagli")
      .eq("id", entityId)
      .maybeSingle();
    if (!ordine) return null;
    const snapshot = parseOrdineFornitoreFornitoreSnapshot(
      (ordine.fornitore_snapshot as Record<string, unknown>) ?? null,
      String(ordine.fornitore_label ?? ""),
    );
    let email = resolveSupplierEmailFromSnapshot(ordine.fornitore_snapshot as Record<string, unknown> ?? {});
    if (!email) {
      const mag = settingsRows.find((r) => r.module === "magazzino" && r.key === "master");
      if (mag?.value && typeof mag.value === "object") {
        const raw = (mag.value as Record<string, unknown>).fornitoreAnagraficaByFornitore;
        if (raw && typeof raw === "object") {
          const key = String(ordine.fornitore_label ?? "").trim().toLowerCase();
          for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
            if (k.toLowerCase() === key || k === ordine.fornitore_label) {
              const em = (v as Record<string, unknown>).email;
              if (typeof em === "string" && isValidEmail(em)) email = em.trim();
            }
          }
        }
      }
    }
    const name = snapshot.ragioneSociale.trim() || snapshot.label.trim();
    return { email, name, clienteId: null };
  }

  if (policy.recipientType !== "customer") return null;

  let clienteLabel = "";
  let clienteId: string | null = null;

  if (entityType === "lavorazioni") {
    const { data: lav } = await client
      .from("lavorazioni")
      .select("mezzo_id")
      .eq("id", entityId)
      .maybeSingle();
    if (lav?.mezzo_id) {
      const { data: mezzo } = await client.from("mezzi").select("cliente").eq("id", lav.mezzo_id).maybeSingle();
      clienteLabel = String(mezzo?.cliente ?? "");
    }
  } else if (entityType === "preventivi") {
    const { data: pv } = await client.from("preventivi").select("cliente").eq("id", entityId).maybeSingle();
    clienteLabel = String(pv?.cliente ?? "");
  } else if (entityType === "vehicle_maintenance_configs") {
    const configId = entityId;
    const { data: cfg } = await client.from("vehicle_maintenance_configs").select("mezzo_id").eq("id", configId).maybeSingle();
    if (cfg?.mezzo_id) {
      const { data: mezzo } = await client.from("mezzi").select("cliente").eq("id", cfg.mezzo_id).maybeSingle();
      clienteLabel = String(mezzo?.cliente ?? "");
    }
  } else if (typeof payload.cliente_label === "string") {
    clienteLabel = payload.cliente_label;
  }

  if (!clienteLabel.trim()) return null;
  const resolved = await resolveClienteByLabel(client, clienteLabel);
  if (resolved) return resolved;

  return { email: "", name: clienteLabel, clienteId };
}

export function buildOfficinaTemplateVars(settingsRows: AppSettingRow[]): Record<string, string> {
  const dest = readOfficinaDestinatarioOrdiniFromRows(settingsRows);
  const sede = formatOfficinaSede(readOfficinaSedeOperativaFromRows(settingsRows));
  const from = process.env.RESEND_FROM?.trim() ?? "";
  return {
    azienda: dest.label.trim(),
    indirizzo: sede,
    telefono_officina: dest.telefono.trim(),
    email_officina: from,
  };
}
