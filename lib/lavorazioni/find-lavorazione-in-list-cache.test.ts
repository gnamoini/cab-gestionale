/**
 * getLavorazioniListFromCache — ignora atomi non-lista sotto lavorazioniQueries.
 */
import assert from "node:assert/strict";
import { QueryClient } from "@tanstack/react-query";
import { QK } from "@/src/lib/react-query/query-keys";
import { lavorazioniListQueryKey } from "@/lib/lavorazioni/lavorazioni-list-query-keys";
import { getLavorazioniListFromCache } from "./find-lavorazione-in-list-cache";
import type { LavorazioneListRow } from "@/src/services/lavorazioni.service";

const qc = new QueryClient();
const row = { id: "lav-1" } as LavorazioneListRow;

qc.setQueryData(lavorazioniListQueryKey(undefined), [row]);
qc.setQueryData([...QK.lavorazioniQueries, "addetti-in-uso"], { attivi: [], storico: [] });
qc.setQueryData([...QK.lavorazioniQueries, "base", "lav-1"], { id: "lav-1", stato: "aperta" });

const rows = getLavorazioniListFromCache(qc);
assert.deepEqual(rows, [row]);

console.log("find-lavorazione-in-list-cache.test.ts OK");
