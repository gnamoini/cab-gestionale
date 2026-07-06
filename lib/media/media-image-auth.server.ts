import "server-only";

import {
  verifyServerPageRead,
  verifyServerPageWrite,
} from "@/src/lib/auth/server-permission-guards";
import { BRANDING_LOGO_STORAGE_PREFIX } from "@/src/lib/storage/storage-paths";
import { isImageStorageScope, type ImageStorageScope } from "@/src/lib/storage/storage-config";
import { normalizeStorageObjectPath } from "@/src/lib/storage/storage-paths";

function sectionForImageScope(scope: ImageStorageScope): "lavorazioni" | "mezzi" | "magazzino" {
  return scope;
}

async function verifyImageScopeModuleAccess(scope: ImageStorageScope): Promise<boolean> {
  const [canRead, canWrite] = await Promise.all([
    verifyServerPageRead(scope),
    verifyServerPageWrite(scope),
  ]);
  return canRead || canWrite;
}

/** Verifica accesso lettura per path oggetto nel bucket `images`. */
export async function verifyMediaImagePathAccess(objectPath: string): Promise<boolean> {
  const normalized = normalizeStorageObjectPath(objectPath);
  if (!normalized || normalized.includes("..")) return false;

  if (normalized.startsWith(BRANDING_LOGO_STORAGE_PREFIX)) {
    return true;
  }

  const [scopeRaw, recordId] = normalized.split("/");
  if (!scopeRaw || !recordId || !isImageStorageScope(scopeRaw)) return false;
  if (recordId.includes("/")) return false;

  return verifyImageScopeModuleAccess(sectionForImageScope(scopeRaw));
}
