import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { IMPORT_FILE_KIND_MODULE } from "@/lib/import-files/import-file-types";

const root = process.cwd();

assert.equal(IMPORT_FILE_KIND_MODULE.ddt_receiving, "magazzino_carichi");

const migration = readFileSync(
  join(root, "supabase/migrations/20260718183605_import_file_ddt_receiving_kind_module.sql"),
  "utf8",
);
assert.match(migration, /when 'ddt_receiving' then 'magazzino_carichi'/);

console.log("import-file-kind-module.test.ts ok");
