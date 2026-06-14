import assert from "node:assert/strict";
import {
  isConfigurazioneLogLeakEntry,
  isDashboardSistemaLogScopeEntry,
  partitionDashboardSistemaLogEntries,
} from "@/lib/dashboard/dashboard-sistema-log-scope";

const base = {
  tone: "update" as const,
  modificaRiga: "• test",
  autore: "Operatore",
  atIso: "2026-06-01T10:00:00.000Z",
};

assert.equal(
  isDashboardSistemaLogScopeEntry({ ...base, tipoRiga: "PROMEMORIA", oggettoRiga: "Revisione mezzo" }),
  true,
);
assert.equal(
  isDashboardSistemaLogScopeEntry({ ...base, tipoRiga: "CREAZIONE", oggettoRiga: "Cose da fare" }),
  true,
);
assert.equal(
  isDashboardSistemaLogScopeEntry({ ...base, tipoRiga: "MODIFICA CONFIGURAZIONE", oggettoRiga: "Branding" }),
  false,
);
assert.equal(
  isDashboardSistemaLogScopeEntry({ ...base, tipoRiga: "MODIFICA IMPOSTAZIONI", oggettoRiga: "Impostazioni" }),
  false,
);

assert.equal(
  isConfigurazioneLogLeakEntry({ ...base, tipoRiga: "MODIFICA CONFIGURAZIONE", oggettoRiga: "Branding" }),
  true,
);
assert.equal(
  isConfigurazioneLogLeakEntry({ ...base, tipoRiga: "UNDO CONFIGURAZIONE", oggettoRiga: "Configurazione globale" }),
  true,
);
assert.equal(
  isConfigurazioneLogLeakEntry({ ...base, tipoRiga: "MODIFICA IMPOSTAZIONI", oggettoRiga: "Impostazioni globali" }),
  true,
);
assert.equal(
  isConfigurazioneLogLeakEntry({ ...base, tipoRiga: "UPDATE", oggettoRiga: "Addetti" }),
  true,
);
assert.equal(
  isConfigurazioneLogLeakEntry({ ...base, tipoRiga: "PROMEMORIA", oggettoRiga: "Call cliente" }),
  false,
);
assert.equal(
  isConfigurazioneLogLeakEntry({ ...base, tipoRiga: "CREAZIONE", oggettoRiga: "Cose da fare" }),
  false,
);

const partition = partitionDashboardSistemaLogEntries([
  {
    id: "1",
    ...base,
    tipoRiga: "PROMEMORIA",
    oggettoRiga: "Evento A",
  },
  {
    id: "2",
    ...base,
    tipoRiga: "CREAZIONE",
    oggettoRiga: "Cose da fare",
  },
  {
    id: "3",
    ...base,
    tipoRiga: "MODIFICA CONFIGURAZIONE",
    oggettoRiga: "Branding",
  },
  {
    id: "4",
    ...base,
    tipoRiga: "LEGACY",
    oggettoRiga: "Voce sconosciuta",
  },
]);

assert.equal(partition.keep.length, 2);
assert.equal(partition.configLeak.length, 1);
assert.equal(partition.droppedCount, 1);
assert.equal(partition.keep[0]?.tipoRiga, "PROMEMORIA");
assert.equal(partition.configLeak[0]?.oggettoRiga, "Branding");

console.log("dashboard-sistema-log-scope.test.ts: OK");
