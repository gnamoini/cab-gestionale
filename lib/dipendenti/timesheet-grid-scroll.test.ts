import assert from "node:assert/strict";
import {
  computeTimesheetColumnScrollLeft,
  isTimesheetColumnFullyVisible,
} from "@/lib/dipendenti/timesheet-grid-scroll";

// Colonna già visibile — nessuno scroll
assert.equal(computeTimesheetColumnScrollLeft(0, 800, 2000, 400, 40, 0), 0);

// Colonna parzialmente a destra — scroll minimo
assert.equal(computeTimesheetColumnScrollLeft(0, 800, 2000, 900, 40, 0), 140);

// Colonna già visibile con scrollLeft > 0 — nessuno scroll
assert.equal(computeTimesheetColumnScrollLeft(500, 800, 2000, 100, 40, 0), 500);

// Colonna tagliata a sinistra — scroll minimo
assert.equal(computeTimesheetColumnScrollLeft(500, 800, 2000, -20, 40, 0), 480);

// Colonna oltre max scroll — clamp
assert.equal(computeTimesheetColumnScrollLeft(0, 800, 900, 400, 40, 0), 0);

assert.equal(
  isTimesheetColumnFullyVisible(
    { getBoundingClientRect: () => ({ left: 0, right: 800, top: 0, bottom: 400 }) } as HTMLElement,
    { getBoundingClientRect: () => ({ left: 400, right: 440, top: 0, bottom: 40 }) } as HTMLElement,
  ),
  true,
);

assert.equal(
  isTimesheetColumnFullyVisible(
    { getBoundingClientRect: () => ({ left: 0, right: 800, top: 0, bottom: 400 }) } as HTMLElement,
    { getBoundingClientRect: () => ({ left: 780, right: 820, top: 0, bottom: 40 }) } as HTMLElement,
  ),
  false,
);

console.log("timesheet-grid-scroll.test.ts OK");
