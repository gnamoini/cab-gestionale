import { resolveRole } from "@/lib/auth/rbac";
import type { MezzoRow } from "@/src/types/supabase-tables";
import type { LavorazioneListRow } from "@/src/services/lavorazioni.service";

/** Messaggio UI/salvataggio quando manca il cliente associato per ruolo Cliente. */
export const CLIENTE_ASSOCIATION_REQUIRED_MSG =
  "Per gli utenti con ruolo Cliente è obbligatorio selezionare un cliente associato.";

export const CLIENTE_REF_UNKNOWN_MSG = "Il cliente selezionato non è presente in anagrafica clienti.";

/** Hint breve sotto il campo (card mobile / UI densa). */
export const CLIENTE_ASSOCIATION_REQUIRED_SHORT_MSG = "Seleziona un cliente dall'anagrafica.";

export const CLIENTE_REF_UNKNOWN_SHORT_MSG = "Cliente non presente in anagrafica.";

/** Mappa messaggio validazione lungo → copy campo compatta. */
export function fieldClienteAssociationMessage(err: string | null): string | null {
  if (!err) return null;
  if (err === CLIENTE_ASSOCIATION_REQUIRED_MSG) return CLIENTE_ASSOCIATION_REQUIRED_SHORT_MSG;
  if (err === CLIENTE_REF_UNKNOWN_MSG) return CLIENTE_REF_UNKNOWN_SHORT_MSG;
  return err;
}

/** Normalizza il riferimento cliente (label `mezzi.cliente`). */
export function normalizeClienteRef(value: string | null | undefined): string | null {
  const t = typeof value === "string" ? value.trim() : "";
  return t || null;
}

export function buildKnownClientiSet(clienti: readonly string[]): Set<string> {
  const out = new Set<string>();
  for (const raw of clienti) {
    const n = normalizeClienteRef(raw);
    if (n) out.add(n);
  }
  return out;
}

export function clienteRoleRequiresRef(role: string | null | undefined): boolean {
  return resolveRole(role) === "cliente";
}

export function roleHasClientPortalAccess(role: string | null | undefined): boolean {
  const r = resolveRole(role);
  return r === "admin" || r === "cliente";
}

export function validateClienteRefForRole(
  role: string | null | undefined,
  clienteRef: string | null | undefined,
): string | null {
  if (!clienteRoleRequiresRef(role)) return null;
  if (normalizeClienteRef(clienteRef)) return null;
  return CLIENTE_ASSOCIATION_REQUIRED_MSG;
}

export function validateClienteRefExists(
  clienteRef: string | null | undefined,
  knownClienti: Set<string>,
): string | null {
  const ref = normalizeClienteRef(clienteRef);
  if (!ref) return CLIENTE_ASSOCIATION_REQUIRED_MSG;
  if (knownClienti.size > 0 && !knownClienti.has(ref)) return CLIENTE_REF_UNKNOWN_MSG;
  return null;
}

/** Obbligatorietà + esistenza in anagrafica (`mezzi.cliente` distinti). */
export function validateClienteAssociationForRole(
  role: string | null | undefined,
  clienteRef: string | null | undefined,
  knownClienti?: Set<string>,
): string | null {
  const required = validateClienteRefForRole(role, clienteRef);
  if (required) return required;
  if (!clienteRoleRequiresRef(role) || !knownClienti?.size) return null;
  const ref = normalizeClienteRef(clienteRef);
  if (ref && !knownClienti.has(ref)) return CLIENTE_REF_UNKNOWN_MSG;
  return null;
}

export function mezzoMatchesClienteRef(
  mezzo: Pick<MezzoRow, "cliente"> | null | undefined,
  clienteRef: string | null | undefined,
  opts?: { failClosedForClienteRole?: boolean; role?: string | null },
): boolean {
  const ref = normalizeClienteRef(clienteRef);
  if (!ref) {
    if (opts?.failClosedForClienteRole && clienteRoleRequiresRef(opts.role)) return false;
    return true;
  }
  if (!mezzo) return false;
  return normalizeClienteRef(mezzo.cliente) === ref;
}

export function lavorazioneMatchesClienteScope(
  row: Pick<LavorazioneListRow, "mezzo">,
  clienteRef: string | null | undefined,
  opts?: { failClosedForClienteRole?: boolean; role?: string | null },
): boolean {
  const ref = normalizeClienteRef(clienteRef);
  if (!ref) {
    if (opts?.failClosedForClienteRole && clienteRoleRequiresRef(opts.role)) return false;
    return true;
  }
  return mezzoMatchesClienteRef(row.mezzo, ref, opts);
}
