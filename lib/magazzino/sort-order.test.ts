import assert from "node:assert/strict";
import { compareMagazzinoDefaultOrder } from "@/lib/magazzino/sort-order";
import { defaultRicambioMagazzinoFields } from "@/lib/magazzino/ricambio-magazzino-defaults";

const order = new Map<string, number>([
  ["z", 2],
  ["a", 0],
  ["m", 1],
]);

const rows = [
  defaultRicambioMagazzinoFields({ id: "z", descrizione: "Z", marca: "Schmidt" }),
  defaultRicambioMagazzinoFields({ id: "a", descrizione: "A", marca: "Bucher" }),
  defaultRicambioMagazzinoFields({ id: "m", descrizione: "M", marca: "Bucher" }),
];

const sorted = [...rows].sort((a, b) => compareMagazzinoDefaultOrder(a, b, order));

assert.deepEqual(
  sorted.map((r) => r.id),
  ["a", "m", "z"],
  "default order: marca asc, then natural tie-break",
);

console.log("sort-order.test.ts OK");
