import { REALTIME_PUBLICATION_NAME } from "@/lib/production/expected-realtime-publication";

export type RealtimePublicationSnapshot = {
  connected: boolean;
  tables: string[];
  error?: string;
};

/**
 * Legge tabelle in publication live (read-only) via postgres diretto.
 * Richiede SUPABASE_DB_URL o DATABASE_URL (pooler Supabase).
 */
export async function fetchRealtimePublicationTables(): Promise<RealtimePublicationSnapshot> {
  const dbUrl = process.env.SUPABASE_DB_URL?.trim() || process.env.DATABASE_URL?.trim();
  if (!dbUrl) {
    return {
      connected: false,
      tables: [],
      error: "SUPABASE_DB_URL o DATABASE_URL assente — live publication check skipped",
    };
  }

  try {
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
  } catch (err) {
    return {
      connected: false,
      tables: [],
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
