import assert from "node:assert/strict";
import {
  entityDispatchIdempotencyKey,
  entityOutboxIdempotencyKey,
} from "@/lib/notifications/dispatch/entity-idempotency";

assert.equal(
  entityDispatchIdempotencyKey("lavorazioni.created", "lavorazioni", "abc-123"),
  "lavorazioni.created:lavorazioni:abc-123",
);

assert.equal(
  entityOutboxIdempotencyKey("magazzino.below_minimum", "magazzino_ricambi", "ric-1", "10->2"),
  "magazzino.below_minimum:magazzino_ricambi:ric-1:10->2",
);

assert.equal(
  entityDispatchIdempotencyKey("lavorazioni.completed", "lavorazioni", "lav-9"),
  entityOutboxIdempotencyKey("lavorazioni.completed", "lavorazioni", "lav-9"),
);

console.log("entity-idempotency.test.ts OK");
