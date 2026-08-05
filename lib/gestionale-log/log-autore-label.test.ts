import assert from "node:assert/strict";
import { logAutoreLabel } from "@/lib/gestionale-log/log-modifiche-view-model";
import type { LogModificaWithProfileRow } from "@/src/types/supabase-tables";

const base = {
  id: "1",
  entita: "lavorazioni",
  entita_id: "lav-1",
  azione: "UPDATE",
  payload: {},
  created_at: "2026-01-01T00:00:00.000Z",
} satisfies Partial<LogModificaWithProfileRow>;

assert.equal(
  logAutoreLabel(
    {
      ...base,
      autore_id: "u-1",
      autore_nome_snapshot: "Mario Rossi",
      profiles: null,
    } as LogModificaWithProfileRow,
    null,
    "",
  ),
  "Mario Rossi",
);

assert.equal(
  logAutoreLabel(
    {
      ...base,
      autore_id: "u-1",
      profiles: { id: "u-1", nome: "Mario", cognome: "Rossi" },
    } as LogModificaWithProfileRow,
    null,
    "",
  ),
  "Mario Rossi",
);

const tuLabel = logAutoreLabel(
  {
    ...base,
    autore_id: "u-me",
    profiles: { id: "u-me", nome: "Io", cognome: null },
  } as LogModificaWithProfileRow,
  "u-me",
  "Tu (sessione)",
);
assert.equal(tuLabel, "Tu (sessione)");

assert.equal(
  logAutoreLabel({ ...base, autore_id: null, profiles: null } as LogModificaWithProfileRow, null, ""),
  "Sistema",
);

const unknownUser = logAutoreLabel(
  { ...base, autore_id: "a7f3d92e-0000-0000-0000-000000000001", profiles: null } as LogModificaWithProfileRow,
  null,
  "",
);
assert.equal(unknownUser, "Utente");
assert.doesNotMatch(unknownUser, /a7f3d92e/);

console.log("log-autore-label.test.ts OK");
