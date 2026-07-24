import assert from "node:assert/strict";
import { computeActualLaborHoursFromContenuto } from "@/lib/lavorazioni/compute-actual-labor-hours-from-contenuto";

const contenuto = {
  tipo: "lavorazioni",
  campi: {
    righe: [
      {
        addettiAssegnati: [
          { addetto: "Mario", oreImpiegate: 3 },
          { addetto: "Luigi", oreImpiegate: 2.5 },
        ],
      },
      { addettiAssegnati: [{ addetto: "Mario", oreImpiegate: 1.5 }] },
    ],
  },
};

assert.equal(computeActualLaborHoursFromContenuto(contenuto), 7);

assert.equal(
  computeActualLaborHoursFromContenuto({ doc: contenuto } as Record<string, unknown>),
  7,
);

assert.equal(computeActualLaborHoursFromContenuto({ tipo: "ingresso" }), 0);

console.log("compute-actual-labor-hours-from-contenuto.test.ts OK");
