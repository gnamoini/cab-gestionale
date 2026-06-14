import assert from "node:assert/strict";
import {
  buildTechnicalDetail,
  errorTitle,
  friendlyDescription,
  isTechnicalMessage,
} from "@/lib/observability/error-message-humanize";

assert.equal(isTechnicalMessage("dsInput is not defined"), true);
assert.equal(isTechnicalMessage("Export LoadingMezziListSkeleton doesn't exist in target module"), true);
assert.equal(isTechnicalMessage("Permesso negato."), false);

assert.equal(errorTitle("gestionale", "Export Foo doesn't exist in target module"), "Qualcosa è andato storto");
assert.equal(errorTitle("gestionale", "dsInput is not defined"), "Qualcosa è andato storto");
assert.equal(errorTitle("gestionale", "Sessione scaduta."), "Operazione non riuscita");

assert.equal(
  friendlyDescription("gestionale", "Export LoadingMezziListSkeleton doesn't exist in target module"),
  "Non siamo riusciti a caricare questa pagina.\nRiprova tra qualche istante.",
);
assert.equal(
  friendlyDescription("gestionale", "dsInput is not defined"),
  "Non siamo riusciti a caricare questa pagina.\nRiprova tra qualche istante.",
);
assert.equal(friendlyDescription("gestionale", "Sessione scaduta."), "Sessione scaduta.");
assert.equal(
  friendlyDescription("global", "Failed to load chunk"),
  "È disponibile una versione aggiornata.\nPremi Riprova per ricaricare.",
);

assert.equal(
  buildTechnicalDetail("Export Foo doesn't exist", "abc123"),
  "Export Foo doesn't exist\n\nDigest: abc123",
);
assert.equal(buildTechnicalDetail("Permesso negato.", undefined), undefined);

console.log("error-message-humanize.test.ts: ok");
