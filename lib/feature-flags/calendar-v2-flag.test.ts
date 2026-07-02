import assert from "node:assert/strict";
import { resolveCalendarV2Enabled } from "@/lib/feature-flags/calendar-v2-flag";

const prev = process.env.NEXT_PUBLIC_CALENDAR_V2;
try {
  delete process.env.NEXT_PUBLIC_CALENDAR_V2;
  assert.equal(resolveCalendarV2Enabled(null), false, "default off");
  assert.equal(resolveCalendarV2Enabled(undefined), false);

  process.env.NEXT_PUBLIC_CALENDAR_V2 = "1";
  assert.equal(resolveCalendarV2Enabled(null), true, "env on");

  process.env.NEXT_PUBLIC_CALENDAR_V2 = "0";
  assert.equal(resolveCalendarV2Enabled(true), false, "env off wins db");

  delete process.env.NEXT_PUBLIC_CALENDAR_V2;
  assert.equal(resolveCalendarV2Enabled(true), true, "db on when env unset");
} finally {
  if (prev === undefined) delete process.env.NEXT_PUBLIC_CALENDAR_V2;
  else process.env.NEXT_PUBLIC_CALENDAR_V2 = prev;
}

console.log("calendar-v2-flag.test.ts OK");
