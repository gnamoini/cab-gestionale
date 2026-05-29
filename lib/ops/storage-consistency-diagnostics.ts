import { createClient } from "@supabase/supabase-js";
import { assertSupabasePublicEnv } from "@/lib/env/supabase-public";
import { readSupabaseServiceRoleKey } from "@/lib/env/supabase-service-role";
import { documentoStoragePathFromStored } from "@/lib/documenti/storage-path-from-stored";

const LEGACY_URL_PATTERN = /^https?:\/\//i;
const ORPHAN_SAMPLE_LIMIT = 100;
const BUCKET_LIST_LIMIT = 500;

export type StorageConsistencyReport = {
  connected: boolean;
  legacyPublicDocumentUrlCount: number;
  documentiWithResolvablePath: number;
  storageOrphanObjectCount: number | null;
  orphanSamplePaths: string[];
  warnings: string[];
};

function collectDbPaths(rows: { url_file: string }[]): Set<string> {
  const out = new Set<string>();
  for (const row of rows) {
    const path = documentoStoragePathFromStored(row.url_file ?? "");
    if (path) out.add(path);
  }
  return out;
}

/** Diagnostica storage documenti (service role, advisory). */
export async function runStorageConsistencyDiagnostics(): Promise<StorageConsistencyReport> {
  const warnings: string[] = [];
  const serviceKey = readSupabaseServiceRoleKey();
  if (!serviceKey) {
    return {
      connected: false,
      legacyPublicDocumentUrlCount: 0,
      documentiWithResolvablePath: 0,
      storageOrphanObjectCount: null,
      orphanSamplePaths: [],
      warnings: ["SUPABASE_SERVICE_ROLE_KEY assente — diagnostica storage saltata."],
    };
  }

  try {
    const { url } = assertSupabasePublicEnv();
    const admin = createClient(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: docRows, error: docErr } = await admin.from("documenti").select("url_file").limit(5000);
    if (docErr) {
      return {
        connected: false,
        legacyPublicDocumentUrlCount: 0,
        documentiWithResolvablePath: 0,
        storageOrphanObjectCount: null,
        orphanSamplePaths: [],
        warnings: [`Lettura documenti fallita: ${docErr.message}`],
      };
    }

    const rows = docRows ?? [];
    const legacyCount = rows.filter((r) => LEGACY_URL_PATTERN.test(String(r.url_file ?? ""))).length;
    const dbPaths = collectDbPaths(rows);

    const { data: listed, error: listErr } = await admin.storage.from("documenti").list("", {
      limit: BUCKET_LIST_LIMIT,
      sortBy: { column: "created_at", order: "desc" },
    });

    if (listErr) {
      warnings.push(`List bucket documenti fallita: ${listErr.message}`);
      return {
        connected: true,
        legacyPublicDocumentUrlCount: legacyCount,
        documentiWithResolvablePath: dbPaths.size,
        storageOrphanObjectCount: null,
        orphanSamplePaths: [],
        warnings,
      };
    }

    const orphanSample: string[] = [];
    let orphanCount = 0;
    for (const item of listed ?? []) {
      if (!item.name || item.id == null) continue;
      const path = item.name;
      if (dbPaths.has(path)) continue;
      orphanCount += 1;
      if (orphanSample.length < ORPHAN_SAMPLE_LIMIT) orphanSample.push(path);
    }

    if (legacyCount > 0) {
      warnings.push(`${legacyCount} righe documenti con url_file http(s) legacy.`);
    }
    if (orphanCount > 0) {
      warnings.push(`${orphanCount} oggetti nel campione bucket senza path DB corrispondente.`);
    }

    return {
      connected: true,
      legacyPublicDocumentUrlCount: legacyCount,
      documentiWithResolvablePath: dbPaths.size,
      storageOrphanObjectCount: orphanCount,
      orphanSamplePaths: orphanSample,
      warnings,
    };
  } catch (e) {
    return {
      connected: false,
      legacyPublicDocumentUrlCount: 0,
      documentiWithResolvablePath: 0,
      storageOrphanObjectCount: null,
      orphanSamplePaths: [],
      warnings: [e instanceof Error ? e.message : "diagnostica storage fallita"],
    };
  }
}
