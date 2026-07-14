import assert from "node:assert/strict";
import { QueryClient } from "@tanstack/react-query";
import { mezziListQueryKey } from "@/lib/render/query-key-factory";
import type { MezzoGestito } from "@/lib/mezzi/types";
import {
  patchMezzoTagliandiInListCaches,
  snapshotMezziListCaches,
} from "@/src/lib/react-query/mezzi-tagliandi-optimistic";

const base: MezzoGestito = {
  id: "m1",
  cliente: "C",
  utilizzatore: "—",
  marca: "M",
  modello: "—",
  targa: "—",
  matricola: "—",
  tipoAttrezzatura: "—",
  anno: 2020,
  oreKm: 0,
  statoAttuale: "Operativo",
  dataUltimaUscita: "—",
  note: "",
  priorita: "normale",
};

const qc = new QueryClient();
const key = mezziListQueryKey("list", null);
qc.setQueryData(key, [base]);

patchMezzoTagliandiInListCaches(qc, "m1", true);
assert.equal(qc.getQueryData<MezzoGestito[]>(key)?.[0]?.tagliandi, true);

patchMezzoTagliandiInListCaches(qc, "m1", false);
assert.equal(qc.getQueryData<MezzoGestito[]>(key)?.[0]?.tagliandi, undefined);

assert.equal(snapshotMezziListCaches(qc).length, 1);

console.log("mezzi-tagliandi-optimistic.test.ts OK");
