/**
 * Maschera input data italiana: format, paste, validazione, cursore.
 */
import assert from "node:assert/strict";
import {
  applyItalianDateMaskChange,
  applyItalianDateBackspace,
  applyItalianDateForwardDelete,
  canonicalizeItalianDateDisplay,
  cursorFromDigitCount,
  extractItalianDateDigits,
  formatItalianDateDigits,
  normalizeItalianDatePaste,
  parseItalianDayDisplayToIso,
  validateItalianDateInput,
} from "@/lib/ui/italian-date-input-mask";

// --- format progressivo ---
assert.equal(formatItalianDateDigits(""), "");
assert.equal(formatItalianDateDigits("1"), "1");
assert.equal(formatItalianDateDigits("6"), "6");
assert.equal(formatItalianDateDigits("06"), "06/");
assert.equal(formatItalianDateDigits("12"), "12/");
assert.equal(formatItalianDateDigits("120"), "12/0");
assert.equal(formatItalianDateDigits("1203"), "12/03/");
assert.equal(formatItalianDateDigits("12032"), "12/03/2");
assert.equal(formatItalianDateDigits("12032026"), "12/03/2026");
assert.equal(formatItalianDateDigits("06072026"), "06/07/2026");

// --- extract ---
assert.equal(extractItalianDateDigits("06/07/2026"), "06072026");
assert.equal(extractItalianDateDigits("06-07-2026"), "06072026");
assert.equal(extractItalianDateDigits("abc06def07"), "0607");

// --- paste ---
assert.equal(normalizeItalianDatePaste("06072026"), "06/07/2026");
assert.equal(normalizeItalianDatePaste("06/07/2026"), "06/07/2026");
assert.equal(normalizeItalianDatePaste("06-07-2026"), "06/07/2026");
assert.equal(normalizeItalianDatePaste("06.07.2026"), "06/07/2026");

// --- cursore ---
assert.equal(cursorFromDigitCount(0), 0);
assert.equal(cursorFromDigitCount(1), 1);
assert.equal(cursorFromDigitCount(2), 3);
assert.equal(cursorFromDigitCount(3), 4);
assert.equal(cursorFromDigitCount(4), 6);
assert.equal(cursorFromDigitCount(5), 7);
assert.equal(cursorFromDigitCount(8), 10);

const mask = (prev: string, next: string, cursor: number) =>
  applyItalianDateMaskChange(prev, next, cursor);

assert.deepEqual(mask("", "1", 1), { display: "1", cursor: 1 });
assert.deepEqual(mask("1", "12", 2), { display: "12/", cursor: 3 });
assert.deepEqual(mask("12/", "12/0", 4), { display: "12/0", cursor: 4 });
assert.deepEqual(mask("12/0", "12/03", 5), { display: "12/03/", cursor: 6 });
assert.deepEqual(mask("12/03/", "12/03/2", 7), { display: "12/03/2", cursor: 7 });
assert.deepEqual(mask("12/03/2", "12/03/20", 8), { display: "12/03/20", cursor: 8 });
assert.deepEqual(mask("12/03/20", "12/03/2026", 10), { display: "12/03/2026", cursor: 10 });

// digitazione compatta simulata
let display = "";
let cursor = 0;
for (const ch of "06072026") {
  const next = display + ch;
  const r = applyItalianDateMaskChange(display, next, next.length);
  display = r.display;
  cursor = r.cursor;
}
assert.equal(display, "06/07/2026");
assert.equal(cursor, 10);

// backspace simulato
const afterBackspace = applyItalianDateMaskChange("06/07/2026", "06/07/202", 8);
assert.equal(afterBackspace.display, "06/07/202");

// --- backspace / delete (solo cifre, slash fissi) ---
const backspace = (
  display: string,
  start: number,
  end = start,
) => applyItalianDateBackspace(display, start, end)!;

assert.deepEqual(backspace("08/06/2026", 3), { display: "0/06/2026", cursor: 1 });
assert.deepEqual(backspace("08/06/2026", 10), { display: "08/06/202", cursor: 9 });
assert.equal(applyItalianDateBackspace("", 0, 0), null);
assert.equal(applyItalianDateBackspace("08/06/2026", 0, 0), null);

assert.deepEqual(backspace("08/06/2026", 1, 5), { display: "02/02/6", cursor: 1 });

const forwardDelete = (
  display: string,
  start: number,
  end = start,
) => applyItalianDateForwardDelete(display, start, end)!;

assert.deepEqual(forwardDelete("08/06/2026", 2), { display: "08/6/2026", cursor: 3 });
assert.deepEqual(forwardDelete("08/06/2026", 3), { display: "08/6/2026", cursor: 3 });

assert.equal(formatItalianDateDigits("0062026"), "0/06/2026");
assert.equal(formatItalianDateDigits("0607202"), "06/07/202");

// --- validazione ---
assert.deepEqual(validateItalianDateInput(""), { status: "incomplete" });
assert.deepEqual(validateItalianDateInput("1"), { status: "incomplete" });
assert.deepEqual(validateItalianDateInput("12/"), { status: "incomplete" });
assert.deepEqual(validateItalianDateInput("06/07/2026"), { status: "valid" });
assert.deepEqual(validateItalianDateInput("31/15/2026"), {
  status: "invalid",
  message: "Data non valida",
});
assert.deepEqual(validateItalianDateInput("99/99/2026"), {
  status: "invalid",
  message: "Data non valida",
});
assert.deepEqual(validateItalianDateInput("31/02/2026"), {
  status: "invalid",
  message: "Data non valida",
});
assert.deepEqual(validateItalianDateInput("32/01/2026"), {
  status: "invalid",
  message: "Data non valida",
});
assert.deepEqual(validateItalianDateInput("12/13/2026"), {
  status: "invalid",
  message: "Data non valida",
});

// --- calendario e anno a 2 cifre ---
assert.deepEqual(validateItalianDateInput("31/06/26"), {
  status: "invalid",
  message: "Data non valida",
});
assert.deepEqual(validateItalianDateInput("31/06/"), {
  status: "invalid",
  message: "Data non valida",
});
assert.deepEqual(validateItalianDateInput("06/07/26"), { status: "valid" });
assert.equal(canonicalizeItalianDateDisplay("06/07/26"), "06/07/2026");
assert.equal(parseItalianDayDisplayToIso("06/07/26").ok, true);
assert.deepEqual(validateItalianDateInput("29/02/26"), {
  status: "invalid",
  message: "Data non valida",
});
assert.deepEqual(validateItalianDateInput("29/02/24"), { status: "valid" });
assert.equal(canonicalizeItalianDateDisplay("29/02/24"), "29/02/2024");
assert.equal(parseItalianDayDisplayToIso("29/02/24").ok, true);

console.log("italian-date-input-mask.test.ts: ok");
