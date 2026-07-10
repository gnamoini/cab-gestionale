import assert from "node:assert/strict";
import { importExportEventBus } from "@/lib/data-import/core/event-bus";

const leaked: string[] = [];
const un = importExportEventBus.subscribe((e) => leaked.push(e.type));
un();

importExportEventBus.emit({ type: "ImportStarted", batchId: "leak-test", entity: "mezzi", rowCount: 0 });
assert.equal(leaked.length, 0, "unsubscribed listener must not receive events");

const scoped: string[] = [];
const unScoped = importExportEventBus.subscribeScoped("b-scoped", (e) => scoped.push(e.type));
unScoped();
importExportEventBus.emit({ type: "ImportStarted", batchId: "b-scoped", entity: "mezzi", rowCount: 1 });
importExportEventBus.emit({ type: "ImportStarted", batchId: "other", entity: "mezzi", rowCount: 1 });
assert.equal(scoped.length, 0, "unsubscribed scoped listener must not receive events");

console.log("import-export-prg/event-bus-leak.test.ts OK");
