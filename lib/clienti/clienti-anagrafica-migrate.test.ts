import assert from "node:assert/strict";
import { seedClientiAnagraficheFromNames } from "@/lib/clienti/clienti-anagrafica-migrate";
import { buildClienteEntityKey } from "@/lib/validation/entity-keys";

async function main() {
  const inserted: string[] = [];
  const existing = new Set<string>();

  const result = await seedClientiAnagraficheFromNames(
    ["Acme S.r.l.", "Acme S.r.l.", "Beta SpA"],
    async (row) => {
      inserted.push(row.entity_key);
      return { error: null };
    },
    async () => existing,
  );

  assert.equal(result.inserted, 2);
  assert.equal(result.skipped, 1);
  assert.equal(inserted.length, 2);
  assert.ok(buildClienteEntityKey("Acme S.r.l."));

  console.log("clienti-anagrafica-migrate.test.ts OK");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
