/* eslint-disable @next/next/no-assign-module-variable -- lint phase2: dynamic import interop requires module handle */
import "server-only";

import { CompanyNotConfiguredError, getCompanyIdForUserOrNull } from "@/lib/document-capture/company-id.server";
import {
  IMPORT_FILE_KIND_MODULE,
  IMPORT_FILE_KINDS,
  type ImportFileKind,
} from "@/lib/import-files/import-file-types";
import {
  IMPORT_SOURCES_MAX_BYTES,
  isAllowedImportFileMime,
} from "@/lib/import-files/import-file-mime.server";
import { createImportFileUploadPolicy } from "@/lib/import-files/upload-policy.server";
import type { GestionalePermissionModule } from "@/src/lib/permissions/gestionale-modules";
import { verifyServerModuleCan } from "@/src/lib/auth/server-permission-guards";
import { createSupabaseServerUserClient } from "@/src/lib/supabase/server-user-client";
import { NextResponse } from "next/server";

export function isImportFileKind(value: string): value is ImportFileKind {
  return (IMPORT_FILE_KINDS as readonly string[]).includes(value);
}

export async function requireImportFileModuleWrite(kind: ImportFileKind): Promise<NextResponse | null> {
  const module = IMPORT_FILE_KIND_MODULE[kind] as GestionalePermissionModule;
  const allowed = await verifyServerModuleCan(module, "write");
  if (!allowed) {
    return NextResponse.json({ error: "Permesso negato", code: "UNAUTHORIZED" }, { status: 403 });
  }
  return null;
}

export async function requireImportFileAuthUser(): Promise<
  { userId: string } | NextResponse
> {
  const sb = await createSupabaseServerUserClient();
  const { data } = await sb.auth.getUser();
  const userId = data.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Non autenticato", code: "UNAUTHORIZED" }, { status: 401 });
  }
  return { userId };
}

export type ImportFileUploadPolicyBody = {
  kind?: string;
  fileName?: string;
  expectedMime?: string;
  expectedSizeBytes?: number;
  importSessionId?: string;
};

export async function handleImportFileUploadPolicy(body: ImportFileUploadPolicyBody) {
  const kindRaw = body.kind?.trim() ?? "";
  const fileName = body.fileName?.trim() ?? "";
  const expectedMime = body.expectedMime?.trim().toLowerCase() ?? "";
  const expectedSizeBytes = Number(body.expectedSizeBytes ?? 0);

  if (!isImportFileKind(kindRaw)) {
    return NextResponse.json({ error: "kind non valido" }, { status: 400 });
  }
  if (!fileName) {
    return NextResponse.json({ error: "fileName richiesto" }, { status: 400 });
  }
  if (!isAllowedImportFileMime(expectedMime)) {
    return NextResponse.json({ error: "MIME non consentito" }, { status: 400 });
  }
  if (!Number.isFinite(expectedSizeBytes) || expectedSizeBytes <= 0) {
    return NextResponse.json({ error: "expectedSizeBytes non valido" }, { status: 400 });
  }
  if (expectedSizeBytes > IMPORT_SOURCES_MAX_BYTES) {
    return NextResponse.json({ error: "File troppo grande" }, { status: 413 });
  }

  const auth = await requireImportFileAuthUser();
  if (auth instanceof NextResponse) return auth;

  const perm = await requireImportFileModuleWrite(kindRaw);
  if (perm) return perm;

  try {
    const policy = await createImportFileUploadPolicy({
      kind: kindRaw,
      fileName,
      expectedMime,
      expectedSizeBytes,
      importSessionId: body.importSessionId,
    });
    void getCompanyIdForUserOrNull();
    return NextResponse.json(policy);
  } catch (e) {
    if (e instanceof CompanyNotConfiguredError) {
      return NextResponse.json({ error: e.message, code: "TENANT_MISSING" }, { status: 403 });
    }
    const message = e instanceof Error ? e.message : "Errore policy upload";
    return NextResponse.json({ error: message, code: "UPLOAD_FAILED" }, { status: 400 });
  }
}
