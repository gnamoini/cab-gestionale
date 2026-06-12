/**
 * Collect pg_stat_statements top queries (requires extension enabled on linked project).
 * @param {(sql: string) => unknown} runSql
 */
export function collectPgStatStatements(runSql) {
  const topByTotal = runSql(
    "SELECT queryid, left(query, 120) AS query_prefix, calls, round(mean_exec_time::numeric, 2) AS mean_exec_time_ms, round(total_exec_time::numeric, 2) AS total_exec_time_ms, rows, shared_blks_read, shared_blks_hit FROM pg_stat_statements WHERE dbid = (SELECT oid FROM pg_database WHERE datname = current_database()) ORDER BY total_exec_time DESC LIMIT 20",
  );

  const topByMean = runSql(
    "SELECT queryid, left(query, 120) AS query_prefix, calls, round(mean_exec_time::numeric, 2) AS mean_exec_time_ms, round(total_exec_time::numeric, 2) AS total_exec_time_ms, rows, shared_blks_read FROM pg_stat_statements WHERE dbid = (SELECT oid FROM pg_database WHERE datname = current_database()) AND calls >= 10 ORDER BY mean_exec_time DESC LIMIT 20",
  );

  const topByIo = runSql(
    "SELECT queryid, left(query, 120) AS query_prefix, calls, shared_blks_read, round(total_exec_time::numeric, 2) AS total_exec_time_ms FROM pg_stat_statements WHERE dbid = (SELECT oid FROM pg_database WHERE datname = current_database()) ORDER BY shared_blks_read DESC LIMIT 20",
  );

  return {
    topByTotalTime: topByTotal.rows ?? [],
    topByMeanTime: topByMean.rows ?? [],
    topBySharedBlksRead: topByIo.rows ?? [],
  };
}

export function collectTableStats(runSql) {
  const payload = runSql(
    "SELECT relname, n_live_tup, seq_scan, idx_scan, n_tup_ins, n_tup_upd FROM pg_stat_user_tables WHERE relname IN ('lavorazioni', 'mezzi', 'magazzino_ricambi', 'movimenti_ricambi', 'preventivi', 'documenti', 'scheda_lavorazione', 'log_modifiche', 'app_settings') ORDER BY relname",
  );
  return payload.rows ?? [];
}
