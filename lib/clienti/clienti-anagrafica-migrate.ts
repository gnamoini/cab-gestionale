import { buildClienteEntityKey } from "@/lib/validation/entity-keys";
import { clienteAnagraficaUiToHeaderInsert, stubClienteAnagraficaForNome } from "@/lib/clienti/clienti-anagrafica-db-adapter";

export type ClienteAnagraficaSeedResult = {
  inserted: number;
  skipped: number;
};

/**
 * Inserisce stub anagrafica per ogni nome in elenco clienti (idempotente su entity_key).
 * Usare dopo deploy migration o da script admin; non modifica app_settings.
 */
export async function seedClientiAnagraficheFromNames(
  clienti: readonly string[],
  insertHeader: (row: ReturnType<typeof clienteAnagraficaUiToHeaderInsert>) => Promise<{ error: { code?: string } | null }>,
  loadExistingKeys: () => Promise<Set<string>>,
): Promise<ClienteAnagraficaSeedResult> {
  const existing = await loadExistingKeys();
  let inserted = 0;
  let skipped = 0;

  for (const raw of clienti) {
    const nome = raw.trim();
    if (!nome) continue;
    const entityKey = buildClienteEntityKey(nome);
    if (!entityKey) continue;
    if (existing.has(entityKey)) {
      skipped += 1;
      continue;
    }
    const stub = stubClienteAnagraficaForNome(nome, entityKey);
    const row = clienteAnagraficaUiToHeaderInsert(stub, entityKey);
    const { error } = await insertHeader(row);
    if (error?.code === "23505") {
      skipped += 1;
      existing.add(entityKey);
      continue;
    }
    if (error) throw error;
    inserted += 1;
    existing.add(entityKey);
  }

  return { inserted, skipped };
}
