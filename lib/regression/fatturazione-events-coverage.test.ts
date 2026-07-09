import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const migrationsDir = path.join(ROOT, "supabase/migrations");

const files = fs.readdirSync(migrationsDir).filter((f) => f.includes("fatturazione") && f.endsWith(".sql"));
const sql = files.map((f) => fs.readFileSync(path.join(migrationsDir, f), "utf8")).join("\n");

const requiredEvents = [
  "draft_created",
  "status_changed",
  "customer_sent",
  "payment_registered",
  "payment_allocated",
  "credit_note_created",
] as const;

for (const ev of requiredEvents) {
  assert.match(sql, new RegExp(ev), `evento ${ev} mancante nelle migration`);
}

assert.match(sql, /invoice_insert_event/);
assert.match(sql, /append_billing_event/);
assert.doesNotMatch(
  fs.readFileSync(path.join(ROOT, "lib/fatturazione/invoice-events.ts"), "utf8"),
  /\.from\(\s*['"]invoice_events['"]\s*\)\s*\.insert/,
);

console.log("fatturazione-events-coverage.test.ts OK");
