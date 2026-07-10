import assert from "node:assert/strict";
import { importExportEventBus } from "@/lib/data-import/core/event-bus";

const globalEvents: string[] = [];
const scopedEvents: string[] = [];
const unGlobal = importExportEventBus.subscribe((e) => globalEvents.push(e.type));
const unScoped = importExportEventBus.subscribeScoped("batch-1", (e) => scopedEvents.push(e.type));

importExportEventBus.emit({ type: "ImportStarted", batchId: "batch-1", entity: "mezzi", rowCount: 3 });
importExportEventBus.emit({ type: "ImportStarted", batchId: "batch-2", entity: "mezzi", rowCount: 1 });
importExportEventBus.emit({
  type: "RowsCommitted",
  batchId: "batch-1",
  created: 1,
  updated: 0,
  skipped: 2,
});

unScoped();
importExportEventBus.emit({ type: "Completed", id: "batch-1", stats: { created: 1 } });

assert.deepEqual(globalEvents, ["ImportStarted", "ImportStarted", "RowsCommitted", "Completed"]);
assert.deepEqual(scopedEvents, ["ImportStarted", "RowsCommitted"]);

unGlobal();
console.log("event-bus.test.ts OK");
