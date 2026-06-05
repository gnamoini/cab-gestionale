import assert from "node:assert/strict";
import {
  buildTechnicalDetail,
  friendlyDescription,
  isTechnicalMessage,
} from "@/lib/observability/error-message-humanize";

assert.equal(isTechnicalMessage("dsInput is not defined"), true);
assert.equal(isTechnicalMessage("ReferenceError: dsInput is not defined"), true);
assert.equal(isTechnicalMessage("Cannot read properties of undefined"), true);
assert.equal(isTechnicalMessage("Failed to fetch"), true);
assert.equal(isTechnicalMessage("TypeError: x is not a function"), true);

assert.equal(isTechnicalMessage("Permesso negato."), false);
assert.equal(isTechnicalMessage(""), false);
assert.equal(isTechnicalMessage("a".repeat(121)), true);

assert.equal(
  friendlyDescription("gestionale", "dsInput is not defined"),
  "Si è verificato un problema temporaneo. Riprova o torna al menu.",
);
assert.equal(
  friendlyDescription("root", "ReferenceError: boom"),
  "Si è verificato un problema temporaneo. Riprova tra qualche istante.",
);
assert.equal(friendlyDescription("gestionale", "Sessione scaduta."), "Sessione scaduta.");
assert.equal(
  friendlyDescription("global", "Failed to load chunk"),
  "L'applicazione non è riuscita ad avviarsi. Riprova o torna alla home.",
);

assert.equal(
  buildTechnicalDetail("dsInput is not defined", "abc123"),
  "dsInput is not defined\n\nDigest: abc123",
);
assert.equal(buildTechnicalDetail("Sessione scaduta.", "abc123"), "Digest: abc123");
assert.equal(buildTechnicalDetail("Permesso negato.", undefined), undefined);
assert.equal(buildTechnicalDetail(undefined, undefined), undefined);

console.log("error-message-humanize.test.ts: ok");
