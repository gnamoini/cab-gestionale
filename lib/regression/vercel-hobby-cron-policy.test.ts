import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

/** Vercel Hobby rejects crons that would run more than once per day (see vercel.json deploy gate). */
const vercel = JSON.parse(fs.readFileSync(path.join(process.cwd(), "vercel.json"), "utf8")) as {
  crons?: { path: string; schedule: string }[];
};

for (const { path: cronPath, schedule } of vercel.crons ?? []) {
  const parts = schedule.trim().split(/\s+/);
  assert.equal(parts.length, 5, `${cronPath}: expected 5-field cron, got "${schedule}"`);
  const [minute, hour] = parts;
  assert.notEqual(minute, "*", `${cronPath}: minute wildcard not allowed on Hobby (${schedule})`);
  assert.notEqual(hour, "*", `${cronPath}: hour wildcard not allowed on Hobby (${schedule})`);
  assert.doesNotMatch(minute, /^\*\/\d+$/, `${cronPath}: sub-hourly minute step not allowed (${schedule})`);
}

console.log("vercel-hobby-cron-policy.test.ts OK");
