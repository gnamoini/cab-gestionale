import "server-only";

import { getServerSession } from "@/src/lib/auth/get-server-session";
import {
  verifyServerIsAdmin,
  verifyServerPageWrite,
} from "@/src/lib/auth/server-permission-guards";
import type { GestionalePageKey } from "@/src/lib/permissions/gestionale-pages";
import type { ImportEntity } from "@/lib/data-import/core/types";
import { getImportPlugin, getImportPluginBySlug } from "@/lib/data-import/registry";

const MODULE_TO_PAGE: Record<string, GestionalePageKey> = {
  magazzino: "magazzino",
  mezzi: "mezzi",
  preventivi: "preventivi",
  ordini_fornitori: "preventivi",
  lavorazioni: "lavorazioni",
  fatturazione: "fatturazione",
  documenti: "documenti",
  dipendenti: "dipendenti",
  report: "report",
};

async function checkPluginPermission(plugin: ReturnType<typeof getImportPlugin>): Promise<{ ok: boolean; status: number; error: string }> {
  if (plugin.permission.kind === "manageSettings") {
    const can = await verifyServerPageWrite("impostazioni");
    return can ? { ok: true, status: 200, error: "" } : { ok: false, status: 403, error: "Permesso negato" };
  }
  const pageKey = MODULE_TO_PAGE[plugin.permission.module];
  if (!pageKey) return { ok: false, status: 403, error: "Permesso negato" };
  const canWrite = await verifyServerPageWrite(pageKey);
  if (!canWrite) return { ok: false, status: 403, error: "Permesso negato" };
  return { ok: true, status: 200, error: "" };
}

export async function requireImportSession() {
  const session = await getServerSession();
  const userId = session.user?.id;
  if (!userId) return { ok: false as const, response: { error: "Sessione non valida", status: 401 } };
  return { ok: true as const, userId };
}

export async function requireImportAuthBySlug(slug: string) {
  const plugin = getImportPluginBySlug(slug);
  const perm = await checkPluginPermission(plugin);
  if (!perm.ok) return { ok: false as const, response: { error: perm.error, status: perm.status } };
  return requireImportSession();
}

export async function requireImportTemplateAuthBySlug(slug: string) {
  const plugin = getImportPluginBySlug(slug);
  if (plugin.permission.kind === "manageSettings") {
    const can = await verifyServerPageWrite("impostazioni");
    if (!can) return { ok: false as const, response: { error: "Permesso negato", status: 403 } };
    return { ok: true as const };
  }
  const pageKey = MODULE_TO_PAGE[plugin.permission.module];
  if (!pageKey) return { ok: false as const, response: { error: "Permesso negato", status: 403 } };
  const canWrite = await verifyServerPageWrite(pageKey);
  const canAdmin = plugin.permission.overwriteRequiresAdmin ? await verifyServerIsAdmin() : false;
  if (!canWrite && !canAdmin) return { ok: false as const, response: { error: "Permesso negato", status: 403 } };
  return { ok: true as const };
}

export async function requireImportAuthByEntity(entity: ImportEntity) {
  return requireImportAuthBySlug(getImportPlugin(entity).routeSlug);
}

/** @deprecated use requireImportAuthBySlug */
export async function requireMagazzinoImportAuth() {
  return requireImportAuthBySlug("magazzino");
}

/** @deprecated use requireImportAuthBySlug */
export async function requireClientiImportAuth() {
  return requireImportAuthBySlug("clienti");
}

/** @deprecated use requireImportTemplateAuthBySlug */
export async function requireMagazzinoTemplateAuth() {
  return requireImportTemplateAuthBySlug("magazzino");
}
