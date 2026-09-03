import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fingerprintInfo } from "@/lib/integrations/unoerp/schema/schema-fingerprint";
import type { UnoerpInfoResponse } from "@/lib/integrations/unoerp/types";

const ROOT = process.cwd();
const fixture = JSON.parse(
  fs.readFileSync(path.join(ROOT, "docs/unoerp-integration/fixtures/articoli-info.json"), "utf8"),
) as UnoerpInfoResponse;

assert.equal(fixture.info?.primary_key, "id_articoli");
assert.ok(fixture.info?.fieldset?.tipo);
const fp = fingerprintInfo(fixture);
assert.ok(fp);

const empty = JSON.parse(
  fs.readFileSync(path.join(ROOT, "docs/unoerp-integration/fixtures/preventivo-info.json"), "utf8"),
) as UnoerpInfoResponse;
assert.equal(empty.info?.primary_key, null);

console.log("unoerp-contract.spec.ts: ok");
