import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const sql = fs.readFileSync(
  path.join(process.cwd(), "supabase/migrations/20261025130000_recidivita_analytics.sql"),
  "utf8",
);

assert.match(sql, /idx_lavorazioni_mezzo_ingresso/);
assert.match(
  sql,
  /CREATE OR REPLACE VIEW public\.analytics_lavorazione_episode_v[\s\S]*security_invoker = true/i,
);
assert.match(sql, /GRANT SELECT ON public\.analytics_lavorazione_episode_v TO authenticated/i);

console.log("recidivita-analytics-migration: ok");
