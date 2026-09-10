/**
 * TKB draft sync writes must bypass tkb_draft_write_security (can_manage_security only).
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const repo = fs.readFileSync(
  path.join(process.cwd(), "lib/domain/technical-knowledge-base/tkb-repository.server.ts"),
  "utf8",
);

assert.match(repo, /createSupabaseServerServiceClient\(\)\.from\("tkb_draft_store"\)\.upsert/, "save/mark stale use service role");

console.log("tkb-draft-store-write-client.test: OK");
