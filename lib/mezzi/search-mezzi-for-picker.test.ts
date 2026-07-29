import assert from "node:assert/strict";
import {
  buildMezzoPickerListItems,
  resolveSingleMezzoPickerEnter,
  searchMezziForPicker,
} from "@/lib/mezzi/search-mezzi-for-picker";
import type { MezzoGestito } from "@/lib/mezzi/types";

function mezzo(partial: Partial<MezzoGestito> & Pick<MezzoGestito, "id">): MezzoGestito {
  const { id, ...rest } = partial;
  return {
    id,
    cliente: "Cliente Test",
    utilizzatore: partial.utilizzatore ?? "",
    marca: partial.marca ?? "Marca Att",
    modello: partial.modello ?? "Modello Att",
    targa: partial.targa ?? "",
    matricola: partial.matricola ?? "",
    tipoAttrezzatura: partial.tipoAttrezzatura ?? "",
    anno: partial.anno ?? 2020,
    oreKm: partial.oreKm ?? 0,
    statoAttuale: partial.statoAttuale ?? "",
    dataUltimaUscita: partial.dataUltimaUscita ?? "",
    note: partial.note ?? "",
    priorita: "normale",
    ...rest,
  };
}

const catalog: MezzoGestito[] = [
  mezzo({
    id: "m1",
    targa: "HB440PC",
    matricola: "MX-440-01",
    cliente: "Mottola - TA",
    marcaTelaio: "IVECO",
    modelloTelaio: "Eurocargo",
    marca: "Compattatore",
    modello: "HB440",
    ultimaModifica: "2026-07-20T10:00:00.000Z",
  }),
  mezzo({
    id: "m2",
    targa: "GG221AA",
    matricola: "MX-221-02",
    cliente: "Mottola - TA",
    marcaTelaio: "IVECO",
    modelloTelaio: "Daily",
    ultimaModifica: "2026-07-19T10:00:00.000Z",
  }),
  mezzo({
    id: "m3",
    targa: "FH889XY",
    cliente: "AMIU Bari",
    marcaTelaio: "IVECO",
    modelloTelaio: "Stralis",
    ultimaModifica: "2026-07-18T10:00:00.000Z",
  }),
  mezzo({
    id: "m4",
    targa: "HB551PC",
    cliente: "AMIU Bari",
    marcaTelaio: "IVECO",
    modelloTelaio: "Eurocargo",
    ultimaModifica: "2026-07-17T10:00:00.000Z",
  }),
  mezzo({
    id: "m5",
    targa: "HB552PC",
    cliente: "AMIU Bari",
    marcaTelaio: "IVECO",
    modelloTelaio: "Eurocargo",
    ultimaModifica: "2026-07-16T10:00:00.000Z",
  }),
];

// fuzzy targa
for (const q of ["hb440pc", "HB 440 PC", "hb-440-pc", "hb440", "440pc"]) {
  const res = searchMezziForPicker(catalog, q);
  assert.ok(
    res.navigableMezzi.some((m) => m.id === "m1"),
    `expected m1 for query ${q}`,
  );
}

// fuzzy matricola
for (const q of ["mx44001", "MX 440 01", "mx-440-01", "44001"]) {
  const res = searchMezziForPicker(catalog, q);
  assert.ok(
    res.navigableMezzi.some((m) => m.id === "m1"),
    `expected m1 for matricola query ${q}`,
  );
}

// ranking: exact plate should be first for specific query
const ranked = searchMezziForPicker(catalog, "HB440PC");
assert.equal(ranked.navigableMezzi[0]?.id, "m1");

// idle: recenti section
const idle = buildMezzoPickerListItems(catalog, "", { recentIds: ["m3", "m1"] });
assert.ok(idle.some((i) => i.kind === "section" && i.sectionId === "recenti"));
const recentMezzi = idle.filter((i) => i.kind === "mezzo").map((i) => i.mezzo.id);
assert.deepEqual(recentMezzi.slice(0, 2), ["m3", "m1"]);

// cliente grouping
const amiu = searchMezziForPicker(catalog, "AMIU");
assert.ok(amiu.items.some((i) => i.kind === "section" && i.label === "AMIU Bari"));
assert.equal(amiu.navigableMezzi.length, 3);

// ident-like query should not force cliente grouping
const ident = searchMezziForPicker(catalog, "HB440PC");
assert.ok(!ident.items.some((i) => i.kind === "section" && i.label.includes("AMIU")));

// single result enter helper
const single = searchMezziForPicker(catalog, "FH889XY");
assert.equal(resolveSingleMezzoPickerEnter(single)?.id, "m3");
const multi = searchMezziForPicker(catalog, "IVECO");
assert.equal(resolveSingleMezzoPickerEnter(multi), null);

console.log("search-mezzi-for-picker.test.ts OK");
