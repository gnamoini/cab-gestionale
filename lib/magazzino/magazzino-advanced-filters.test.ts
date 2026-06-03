import assert from "node:assert/strict";
import test from "node:test";
import {
  FILTER_ALL,
  MAGAZZINO_ADVANCED_FILTERS_EMPTY,
  magazzinoAdvancedFiltersActive,
  magazzinoRowMatchesAdvancedFilters,
  magazzinoRowMatchesTreeCompatFilters,
} from "@/lib/magazzino/magazzino-advanced-filters";
import type { RicambioMagazzino } from "@/lib/magazzino/types";
import type { MezziListePrefs } from "@/lib/mezzi/mezzi-liste-prefs-storage";

const liste: MezziListePrefs = {
  clienti: [],
  utilizzatori: [],
  cantieri: [],
  marche: [],
  modelli: [],
  tipiAttrezzatura: [],
  stati: [],
  attrezzature: [
    {
      id: "att-marca-1",
      nome: "CAT",
      modelli: [{ id: "att-mod-1", nome: "320" }],
    },
  ],
  telai: [
    {
      id: "tel-marca-1",
      nome: "Iveco",
      modelli: [{ id: "tel-mod-1", nome: "Daily" }],
    },
  ],
};

function baseRow(overrides: Partial<RicambioMagazzino> = {}): RicambioMagazzino {
  return {
    id: "r1",
    marca: "Bosch",
    codiceFornitoreOriginale: "ABC",
    codiceFornitoreOriginaleSecondario: "",
    descrizione: "Filtro",
    note: "",
    categoria: "Filtri",
    compatibilitaMezzi: [],
    compatibilitaRefs: [],
    scorta: 1,
    scortaMinima: 0,
    dataUltimaModifica: "2026-01-01T00:00:00.000Z",
    autoreUltimaModifica: "Test",
    prezzoFornitoreOriginale: 10,
    scontoFornitoreOriginale: 0,
    markupPercentuale: 0,
    prezzoVendita: 10,
    fornitoreNonOriginale: "Ricambi Express",
    codiceFornitoreNonOriginale: "RX-1",
    prezzoFornitoreNonOriginale: 8,
    scontoFornitoreNonOriginale: 0,
    ...overrides,
  };
}

test("magazzinoAdvancedFiltersActive include telaio e fornitore", () => {
  assert.equal(magazzinoAdvancedFiltersActive(MAGAZZINO_ADVANCED_FILTERS_EMPTY), false);
  assert.equal(
    magazzinoAdvancedFiltersActive({ ...MAGAZZINO_ADVANCED_FILTERS_EMPTY, telaioMarca: "Iveco" }),
    true,
  );
  assert.equal(
    magazzinoAdvancedFiltersActive({ ...MAGAZZINO_ADVANCED_FILTERS_EMPTY, fornitoreNonOriginale: "Ricambi Express" }),
    true,
  );
});

test("filtro attrezzatura non matcha compat telai", () => {
  const row = baseRow({
    compatibilitaRefs: [{ tree: "telai", marcaId: "tel-marca-1", modelloId: "tel-mod-1" }],
  });
  assert.equal(
    magazzinoRowMatchesTreeCompatFilters(row, "Iveco", "Daily", "telai", liste),
    true,
  );
  assert.equal(
    magazzinoRowMatchesTreeCompatFilters(row, "Iveco", FILTER_ALL, "attrezzature", liste),
    false,
  );
});

test("magazzinoRowMatchesAdvancedFilters per marca ricambio", () => {
  const row = baseRow({ marca: "Bosch" });
  assert.equal(
    magazzinoRowMatchesAdvancedFilters(
      row,
      { ...MAGAZZINO_ADVANCED_FILTERS_EMPTY, marcaRicambio: "Bosch" },
      liste,
    ),
    true,
  );
  assert.equal(
    magazzinoRowMatchesAdvancedFilters(
      row,
      { ...MAGAZZINO_ADVANCED_FILTERS_EMPTY, marcaRicambio: "Mann" },
      liste,
    ),
    false,
  );
});

test("magazzinoRowMatchesAdvancedFilters per fornitore non originale", () => {
  const row = baseRow({ fornitoreNonOriginale: "Ricambi Express" });
  assert.equal(
    magazzinoRowMatchesAdvancedFilters(
      row,
      { ...MAGAZZINO_ADVANCED_FILTERS_EMPTY, fornitoreNonOriginale: "Ricambi Express" },
      liste,
    ),
    true,
  );
  assert.equal(
    magazzinoRowMatchesAdvancedFilters(
      row,
      { ...MAGAZZINO_ADVANCED_FILTERS_EMPTY, fornitoreNonOriginale: "Altro fornitore" },
      liste,
    ),
    false,
  );
});
