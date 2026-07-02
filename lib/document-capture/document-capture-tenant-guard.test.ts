import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const companyId = fs.readFileSync(
  path.join(process.cwd(), "lib/document-capture/company-id.server.ts"),
  "utf8",
);

assert.match(companyId, /TENANT_MISSING/);
assert.doesNotMatch(companyId, /DOCUMENT_CAPTURE_ALLOW_DEFAULT_COMPANY/);

const signup = fs.readFileSync(
  path.join(process.cwd(), "supabase/migrations/20260902131100_profiles_company_id_nullable_signup.sql"),
  "utf8",
);
assert.match(signup, /drop not null/i);
assert.match(signup, /insert into public.profiles \(id, nome, cognome, ruolo, username\)/);

console.log("document-capture-tenant-guard.test.ts OK");
