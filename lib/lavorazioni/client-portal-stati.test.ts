import assert from "node:assert/strict";
import {
  resolveClientPortalStatoId,
  resolveClientPortalStatoLabel,
} from "@/lib/lavorazioni/client-portal-stati";
import { resolveStatoToDbEnum } from "@/src/shared/selectors";
import type { StatoLavorazioneConfig } from "@/lib/lavorazioni/types";

const customStati: StatoLavorazioneConfig[] = [
  { id: "accettazione", label: "Accettazione", color: "#52525b" },
  { id: "da_lavorare", label: "Da lavorare", color: "#0284c7" },
  { id: "completata", label: "Completata", color: "#15803d", closed: true },
];

assert.equal(
  resolveClientPortalStatoId("da_lavorare", customStati),
  "da_lavorare",
  "custom slug must resolve against settings stati, not fallback",
);

assert.notEqual(
  resolveClientPortalStatoId("da_lavorare", customStati),
  "accettazione",
  "custom slug must not fallback to accettazione",
);

assert.equal(
  resolveClientPortalStatoLabel("da_lavorare", customStati),
  "Da lavorare",
  "label must come from settings stati",
);

assert.equal(
  resolveStatoToDbEnum("da_lavorare"),
  "accettazione",
  "legacy resolveStatoToDbEnum still falls back (documents why portale must not use it)",
);

console.log("client-portal-stati.test.ts OK");
