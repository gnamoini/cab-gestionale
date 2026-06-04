import { resolveRole } from "@/lib/auth/rbac";
import type { MezzoRow } from "@/src/types/supabase-tables";
import type { LavorazioneListRow } from "@/src/services/lavorazioni.service";

/** Normalizza il riferimento cliente (label `mezzi.cliente`). */
export function normalizeClienteRef(value: string | null | undefined): string | null {
  const t = typeof value === "string" ? value.trim() : "";
  return t || null;
}

export function clienteRoleRequiresRef(role: string | null | undefined): boolean {
  return resolveRole(role) === "cliente";
}

export function validateClienteRefForRole(
  role: string | null | undefined,
  clienteRef: string | null | undefined,
): string | null {
  if (!clienteRoleRequiresRef(role)) return null;
  if (normalizeClienteRef(clienteRef)) return null;
  return "Per il ruolo Cliente è obbligatorio associare un cliente.";
}

export function mezzoMatchesClienteRef(
  mezzo: Pick<MezzoRow, "cliente"> | null | undefined,
  clienteRef: string | null | undefined,
): boolean {
  const ref = normalizeClienteRef(clienteRef);
  if (!ref) return true;
  if (!mezzo) return false;
  return normalizeClienteRef(mezzo.cliente) === ref;
}

export function lavorazioneMatchesClienteScope(
  row: Pick<LavorazioneListRow, "mezzo">,
  clienteRef: string | null | undefined,
): boolean {
  const ref = normalizeClienteRef(clienteRef);
  if (!ref) return true;
  return mezzoMatchesClienteRef(row.mezzo, ref);
}
