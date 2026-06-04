import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { assertSupabasePublicEnv } from "@/lib/env/supabase-public";
import { readSupabaseServiceRoleKey } from "@/lib/env/supabase-service-role";
import { documentoStoragePathFromStored } from "@/lib/documenti/storage-path-from-stored";

const LEGACY_URL_PATTERN = /^https?:\/\//i;
const MISSING_CHECK_SAMPLE_LIMIT = 40;

export type DocumentoUrlRow = { id: string; url_file: string };

export type DocumentoUrlClassification = {
  id: string;
  url_file: string;
  isLegacyHttpUrl: boolean;
  hasResolvablePath: boolean;
  storagePath: string | null;
  /** Legacy http(s) ma path estraibile → bonificabile automaticamente. */
  legacyResolvable: boolean;
};

export type DocumentiUrlInventoryReport = {
  connected: boolean;
  totalRows: number;
  legacyHttpCount: number;
  unresolvablePathCount: number;
  legacyResolvableCount: number;
  resolvablePathCount: number;
  missingStorageSampleCount: number;
  unresolvableSample: DocumentoUrlClassification[];
  legacyResolvableSample: DocumentoUrlClassification[];
  missingStorageSample: { id: string; storagePath: string }[];
  warnings: string[];
};

export function classifyDocumentoUrlRow(row: DocumentoUrlRow): DocumentoUrlClassification {
  const raw = row.url_file?.trim() ?? "";
  const isLegacyHttpUrl = LEGACY_URL_PATTERN.test(raw);
  const storagePath = documentoStoragePathFromStored(raw);
  const hasResolvablePath = Boolean(storagePath);
  return {
    id: row.id,
    url_file: raw,
    isLegacyHttpUrl,
    hasResolvablePath,
    storagePath,
    legacyResolvable: isLegacyHttpUrl && hasResolvablePath,
  };
}

export function buildDocumentiUrlInventory(
  rows: DocumentoUrlRow[],
): Omit<DocumentiUrlInventoryReport, "connected" | "missingStorageSampleCount" | "missingStorageSample" | "warnings"> {
  const classified = rows.map(classifyDocumentoUrlRow);
  const legacyHttpCount = classified.filter((c) => c.isLegacyHttpUrl).length;
  const unresolvablePathCount = classified.filter((c) => !c.hasResolvablePath).length;
  const legacyResolvableCount = classified.filter((c) => c.legacyResolvable).length;
  const resolvablePathCount = classified.filter((c) => c.hasResolvablePath).length;

  return {
    totalRows: rows.length,
    legacyHttpCount,
    unresolvablePathCount,
    legacyResolvableCount,
    resolvablePathCount,
    unresolvableSample: classified.filter((c) => !c.hasResolvablePath).slice(0, 15),
    legacyResolvableSample: classified.filter((c) => c.legacyResolvable).slice(0, 15),
  };
}

async function storageObjectExists(
  admin: SupabaseClient,
  storagePath: string,
): Promise<boolean> {
  const parts = storagePath.split("/").filter(Boolean);
  if (parts.length < 2) return false;
  const folder = parts[0]!;
  const fileName = parts.slice(1).join("/");
  const { data, error } = await admin.storage.from("documenti").list(folder, { limit: 200 });
  if (error) return false;
  return (data ?? []).some((item) => item.name === fileName);
}

/** Inventario url_file + campione oggetti mancanti in bucket (service role). */
export async function runDocumentiUrlInventory(): Promise<DocumentiUrlInventoryReport> {
  const warnings: string[] = [];
  const serviceKey = readSupabaseServiceRoleKey();
  if (!serviceKey) {
    return {
      connected: false,
      totalRows: 0,
      legacyHttpCount: 0,
      unresolvablePathCount: 0,
      legacyResolvableCount: 0,
      resolvablePathCount: 0,
      missingStorageSampleCount: 0,
      unresolvableSample: [],
      legacyResolvableSample: [],
      missingStorageSample: [],
      warnings: ["SUPABASE_SERVICE_ROLE_KEY assente — inventario documenti saltato."],
    };
  }

  try {
    const { url } = assertSupabasePublicEnv();
    const admin = createClient(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: docRows, error: docErr } = await admin
      .from("documenti")
      .select("id, url_file")
      .limit(5000);
    if (docErr) {
      return {
        connected: false,
        totalRows: 0,
        legacyHttpCount: 0,
        unresolvablePathCount: 0,
        legacyResolvableCount: 0,
        resolvablePathCount: 0,
        missingStorageSampleCount: 0,
        unresolvableSample: [],
        legacyResolvableSample: [],
        missingStorageSample: [],
        warnings: [`Lettura documenti fallita: ${docErr.message}`],
      };
    }

    const rows = (docRows ?? []) as DocumentoUrlRow[];
    const base = buildDocumentiUrlInventory(rows);

    const missingStorageSample: { id: string; storagePath: string }[] = [];
    const toCheck = rows
      .map(classifyDocumentoUrlRow)
      .filter((c) => c.hasResolvablePath && c.storagePath)
      .slice(0, MISSING_CHECK_SAMPLE_LIMIT);

    for (const item of toCheck) {
      const path = item.storagePath!;
      const exists = await storageObjectExists(admin, path);
      if (!exists) missingStorageSample.push({ id: item.id, storagePath: path });
    }

    if (base.legacyHttpCount > 0) {
      warnings.push(`${base.legacyHttpCount} documenti con url_file http(s) legacy.`);
    }
    if (base.unresolvablePathCount > 0) {
      warnings.push(`${base.unresolvablePathCount} documenti senza path storage risolvibile.`);
    }
    if (base.legacyResolvableCount > 0) {
      warnings.push(
        `${base.legacyResolvableCount} legacy URL bonificabili (npm run documenti:remediate-url-file).`,
      );
    }
    if (missingStorageSample.length > 0) {
      warnings.push(
        `${missingStorageSample.length}/${toCheck.length} nel campione hanno path DB ma oggetto assente in storage.`,
      );
    }

    return {
      connected: true,
      ...base,
      missingStorageSampleCount: missingStorageSample.length,
      missingStorageSample,
      warnings,
    };
  } catch (e) {
    return {
      connected: false,
      totalRows: 0,
      legacyHttpCount: 0,
      unresolvablePathCount: 0,
      legacyResolvableCount: 0,
      resolvablePathCount: 0,
      missingStorageSampleCount: 0,
      unresolvableSample: [],
      legacyResolvableSample: [],
      missingStorageSample: [],
      warnings: [e instanceof Error ? e.message : "inventario documenti fallito"],
    };
  }
}
