import { REALTIME_PUBLICATION_NAME } from "@/lib/production/expected-realtime-publication";
import { resolveSupabaseProjectRef } from "@/lib/production/supabase-project-ref";

export type RealtimePublicationSnapshot = {
  connected: boolean;
  tables: string[];
  error?: string;
};

const PUBLICATION_SQL = `SELECT tablename FROM pg_publication_tables WHERE pubname = '${REALTIME_PUBLICATION_NAME}' ORDER BY tablename`;

function parsePublicationRows(payload: unknown): string[] {
  const rows = Array.isArray(payload)
    ? payload
    : payload && typeof payload === "object"
      ? ((payload as { result?: unknown[]; rows?: unknown[] }).result ??
        (payload as { rows?: unknown[] }).rows ??
        [])
      : [];

  return rows
    .map((row) => {
      if (!row || typeof row !== "object") return null;
      const tablename = (row as { tablename?: unknown }).tablename;
      return typeof tablename === "string" ? tablename : null;
    })
    .filter((name): name is string => Boolean(name))
    .sort();
}

async function fetchViaPostgres(dbUrl: string): Promise<RealtimePublicationSnapshot> {
  const pg = await import("pg");
  const client = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    const res = await client.query<{ tablename: string }>(
      `SELECT tablename FROM pg_publication_tables WHERE pubname = $1 ORDER BY tablename`,
      [REALTIME_PUBLICATION_NAME],
    );
    const tables = res.rows.map((r) => r.tablename).sort();
    return { connected: true, tables };
  } finally {
    await client.end();
  }
}

async function fetchViaManagementApi(
  accessToken: string,
  projectRef: string,
): Promise<RealtimePublicationSnapshot> {
  const res = await fetch(
    `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: PUBLICATION_SQL }),
    },
  );

  const text = await res.text();
  if (!res.ok) {
    return {
      connected: false,
      tables: [],
      error: `Management API publication query HTTP ${res.status}: ${text.slice(0, 200)}`,
    };
  }

  try {
    const payload = JSON.parse(text) as unknown;
    const tables = parsePublicationRows(payload);
    return { connected: true, tables };
  } catch (err) {
    return {
      connected: false,
      tables: [],
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Legge tabelle in publication live (read-only).
 * Ordine: postgres diretto → Management API (`SUPABASE_ACCESS_TOKEN`) → skip.
 */
export async function fetchRealtimePublicationTables(): Promise<RealtimePublicationSnapshot> {
  const dbUrl = process.env.SUPABASE_DB_URL?.trim() || process.env.DATABASE_URL?.trim();
  if (dbUrl) {
    try {
      return await fetchViaPostgres(dbUrl);
    } catch (err) {
      return {
        connected: false,
        tables: [],
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  const accessToken = process.env.SUPABASE_ACCESS_TOKEN?.trim();
  const projectRef = resolveSupabaseProjectRef();
  if (accessToken && projectRef) {
    return fetchViaManagementApi(accessToken, projectRef);
  }

  const missing: string[] = [];
  if (!accessToken) missing.push("SUPABASE_ACCESS_TOKEN");
  if (!projectRef) missing.push("NEXT_PUBLIC_SUPABASE_URL (project ref)");

  return {
    connected: false,
    tables: [],
    error: `${missing.join(" e/o ")} assente — live publication check skipped`,
  };
}
