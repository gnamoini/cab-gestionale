import assert from "node:assert/strict";
import { MAGAZZINO_ADVANCED_FILTERS_EMPTY } from "@/lib/magazzino/magazzino-advanced-filters";
import { resolveMagazzinoNewRicambioSeedCodice } from "@/lib/magazzino/magazzino-new-ricambio-seed";
import type { MagazzinoPageFilters } from "@/lib/magazzino/magazzino-list-ui-filters";
import type { RicambioMagazzino } from "@/lib/magazzino/types";
import { createMezziListePrefsDefault } from "@/lib/mezzi/mezzi-liste-prefs-storage";

const mezziListePrefs = createMezziListePrefsDefault();

const baseFilters: MagazzinoPageFilters = {
  ...MAGAZZINO_ADVANCED_FILTERS_EMPTY,
  search: "",
  soloSottoScorta: false,
  nascondiScortaZero: false,
};

const prodotti: RicambioMagazzino[] = [
  {
    id: "ric-1",
    marca: "Bosch",
    codiceFornitoreOriginale: "ABC123",
    codiceFornitoreOriginaleSecondario: "",
    marcaOriginaleSecondaria: "",
    usatoInTagliandi: false,
    unitaMisura: "pz",
    descrizione: "Filtro",
    note: "",
    categoria: "Filtri",
    compatibilitaMezzi: [],
    scorta: 10,
    scortaMinima: 2,
    dataUltimaModifica: "2026-06-01T10:00:00.000Z",
    autoreUltimaModifica: "Test",
    prezzoFornitoreOriginale: 10,
    scontoFornitoreOriginale: 0,
    markupPercentuale: 0,
    prezzoVendita: 10,
    fornitoriAlternativi: [],
    fornitoreNonOriginale: "",
    codiceFornitoreNonOriginale: "",
    prezzoFornitoreNonOriginale: 0,
    scontoFornitoreNonOriginale: 0,
  },
  {
    id: "ric-sotto",
    marca: "SKF",
    codiceFornitoreOriginale: "45732000099",
    codiceFornitoreOriginaleSecondario: "",
    marcaOriginaleSecondaria: "",
    usatoInTagliandi: false,
    unitaMisura: "pz",
    descrizione: "Cuscinetto",
    note: "",
    categoria: "Meccanica",
    compatibilitaMezzi: [],
    scorta: 10,
    scortaMinima: 5,
    dataUltimaModifica: "2026-06-01T10:00:00.000Z",
    autoreUltimaModifica: "Test",
    prezzoFornitoreOriginale: 10,
    scontoFornitoreOriginale: 0,
    markupPercentuale: 0,
    prezzoVendita: 10,
    fornitoriAlternativi: [],
    fornitoreNonOriginale: "",
    codiceFornitoreNonOriginale: "",
    prezzoFornitoreNonOriginale: 0,
    scontoFornitoreNonOriginale: 0,
  },
];

assert.equal(
  resolveMagazzinoNewRicambioSeedCodice({
    searchQuery: "",
    prodotti,
    pageFilters: baseFilters,
    mezziListePrefs,
  }),
  null,
);

assert.equal(
  resolveMagazzinoNewRicambioSeedCodice({
    searchQuery: "filtro olio",
    prodotti,
    pageFilters: { ...baseFilters, search: "filtro olio" },
    mezziListePrefs,
  }),
  null,
);

assert.equal(
  resolveMagazzinoNewRicambioSeedCodice({
    searchQuery: "8ESNS030000001",
    prodotti,
    pageFilters: { ...baseFilters, search: "8ESNS030000001" },
    mezziListePrefs,
  }),
  "8ESNS030000001",
);

assert.equal(
  resolveMagazzinoNewRicambioSeedCodice({
    searchQuery: "   CF60SLA   ",
    prodotti,
    pageFilters: { ...baseFilters, search: "CF60SLA" },
    mezziListePrefs,
  }),
  "CF60SLA",
);

assert.equal(
  resolveMagazzinoNewRicambioSeedCodice({
    searchQuery: "ABC123",
    prodotti,
    pageFilters: { ...baseFilters, search: "ABC123" },
    mezziListePrefs,
  }),
  null,
);

assert.equal(
  resolveMagazzinoNewRicambioSeedCodice({
    searchQuery: "45732000099",
    prodotti,
    pageFilters: {
      ...baseFilters,
      search: "45732000099",
      soloSottoScorta: true,
    },
    mezziListePrefs,
  }),
  "45732000099",
);

console.log("magazzino-new-ricambio-seed.test.ts OK");
