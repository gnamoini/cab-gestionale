#!/usr/bin/env npx tsx
/** CLI diagnostica drift stock (R-23) — non modifica dati. */
import { buildStockIntegrityRow, formatStockIntegrityReport } from "@/lib/magazzino/verify-stock-integrity";

const demo = [
  buildStockIntegrityRow({
    ricambio: { id: "1", codice: "DEMO-OK", nome: "Filtro OK", quantita: 10 },
    movements: [
      { tipo: "entrata", quantita: 15 },
      { tipo: "uscita", quantita: 5 },
    ],
    baselineQuantity: 0,
  }),
  buildStockIntegrityRow({
    ricambio: { id: "2", codice: "DEMO-DRIFT", nome: "Filtro drift", quantita: 50 },
    movements: [{ tipo: "entrata", quantita: 38 }],
    baselineQuantity: 0,
  }),
];

console.log(formatStockIntegrityReport(demo));
