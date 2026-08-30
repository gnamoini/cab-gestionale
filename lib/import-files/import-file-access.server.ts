/* eslint-disable @next/next/no-assign-module-variable -- lint phase2: dynamic import interop requires module handle */
import "server-only";

import {
  IMPORT_FILE_KIND_MODULE,
  type ImportFileKind,
} from "@/lib/import-files/import-file-types";
import type { GestionalePermissionModule } from "@/src/lib/permissions/gestionale-modules";
import { verifyServerModuleCan } from "@/src/lib/auth/server-permission-guards";
import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";

export class ImportFileAccessError extends Error {
  readonly code: "NOT_FOUND" | "FORBIDDEN" = "FORBIDDEN";

  constructor(message: string, code: "NOT_FOUND" | "FORBIDDEN" = "FORBIDDEN") {
    super(message);
    this.name = "ImportFileAccessError";
    this.code = code;
  }
}

type ImportFileAccessRow = {
  id: string;
  kind: ImportFileKind;
  uploaded_by: string;
  status: string;
};

export async function loadImportFileForAccess(fileId: string): Promise<ImportFileAccessRow> {
  const sb = await createSupabaseServerUserClient();
  const { data: userData } = await sb.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) throw new ImportFileAccessError("Non autenticato");

  const { data, error } = await sb
    .from("import_files")
    .select("id, kind, uploaded_by, status")
    .eq("id", fileId)
    .maybeSingle();

  if (error) throw new ImportFileAccessError(error.message);
  if (!data) throw new ImportFileAccessError("Import file non trovato", "NOT_FOUND");

  return data as ImportFileAccessRow;
}

export async function assertImportFileOwner(fileId: string, userId: string): Promise<ImportFileAccessRow> {
  const row = await loadImportFileForAccess(fileId);
  if (row.uploaded_by !== userId) {
    throw new ImportFileAccessError("Solo il caricatore può annullare questo import");
  }
  return row;
}

export async function assertImportFileProcessAccess(
  fileId: string,
  userId: string,
): Promise<ImportFileAccessRow> {
  const row = await loadImportFileForAccess(fileId);
  if (row.uploaded_by === userId) return row;

  const module = IMPORT_FILE_KIND_MODULE[row.kind] as GestionalePermissionModule;
  const allowed = await verifyServerModuleCan(module, "write");
  if (!allowed) {
    throw new ImportFileAccessError("Permesso negato");
  }
  return row;
}
