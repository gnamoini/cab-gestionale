import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

const batcher = fs.readFileSync(path.join(ROOT, "src/services/internal/log-modifiche-batcher.ts"), "utf8");
const auditLog = fs.readFileSync(path.join(ROOT, "src/services/internal/audit-log.ts"), "utf8");
const resolveActor = fs.readFileSync(path.join(ROOT, "lib/audit/resolve-actor.ts"), "utf8");
const resolveAuthor = fs.readFileSync(path.join(ROOT, "lib/auth/resolve-author-label.ts"), "utf8");
const lavorazioniService = fs.readFileSync(path.join(ROOT, "src/services/lavorazioni.service.ts"), "utf8");
const inventoryApply = fs.readFileSync(
  path.join(ROOT, "lib/inventory-receiving/apply/inventory-receiving-apply-rpc.server.ts"),
  "utf8",
);
const magazzinoUltima = fs.readFileSync(path.join(ROOT, "lib/magazzino/magazzino-ultima-modifica.ts"), "utf8");

// RC1: autore congelato all'enqueue
assert.match(batcher, /freezeAutoreId/);
assert.match(batcher, /resolveWriteActorIdFromClient/);

// Write path: autore_id risolto prima di recordAuditEvent
assert.match(auditLog, /resolveWriteActorIdFromClient/);
assert.match(auditLog, /input\.autore_id !== undefined/);

// Server-authoritative session (no trusted client UUID in inventory apply)
assert.match(inventoryApply, /resolveWriteActorIdFromServerSession/);
assert.doesNotMatch(inventoryApply, /input\.userId/);

// No client override created_by on lavorazioni create
assert.doesNotMatch(lavorazioniService, /data\.created_by/);

// Display: viewer non usato come fallback generico
assert.match(resolveAuthor, /unknownUserLabel/);
assert.doesNotMatch(resolveAuthor, /viewerDisplayName.*unknown/i);

// Priorità log su meta (magazzino)
assert.match(magazzinoUltima, /buildUltimaModificaByRicambioIdFromLogs/);

// resolveAuditActor: non ri-risolve se autoreId esplicitamente null
assert.match(resolveActor, /input\.autoreId === undefined/);

console.log("author-identity-e2e-gate.test.ts OK (static gate — manual A/B cross-read still required pre-Phase-2 deploy)");
