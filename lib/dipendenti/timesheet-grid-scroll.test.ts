import assert from "node:assert/strict";
import { computeTimesheetColumnScrollLeft } from "@/lib/dipendenti/timesheet-grid-scroll";

assert.equal(computeTimesheetColumnScrollLeft(0, 800, 2000, 900, 40, 0), 520);

assert.equal(computeTimesheetColumnScrollLeft(500, 800, 2000, 100, 40, 0), 220);

assert.equal(computeTimesheetColumnScrollLeft(0, 800, 900, 400, 40, 0), 20);

console.log("timesheet-grid-scroll.test.ts OK");
