import assert from "node:assert/strict";
import {
  ASSET_LIFECYCLE_V1_DEFAULT,
  parseAssetLifecycleV1Flags,
  resolveAssetLifecycleV1Flags,
} from "@/lib/officina/asset-lifecycle-v1-flag";

assert.deepEqual(parseAssetLifecycleV1Flags(null), ASSET_LIFECYCLE_V1_DEFAULT);

assert.deepEqual(
  parseAssetLifecycleV1Flags({
    enabled: true,
    compliance: true,
    assignment_history: false,
    mileage_history: true,
    timeline_calendar: false,
  }),
  {
    enabled: true,
    compliance: true,
    assignment_history: false,
    mileage_history: true,
    timeline_calendar: false,
  },
);

const prev = process.env.NEXT_PUBLIC_ASSET_LIFECYCLE_V1;
try {
  process.env.NEXT_PUBLIC_ASSET_LIFECYCLE_V1 = "0";
  assert.deepEqual(
    resolveAssetLifecycleV1Flags({
      enabled: true,
      compliance: true,
      assignment_history: true,
      mileage_history: true,
      timeline_calendar: true,
    }),
    ASSET_LIFECYCLE_V1_DEFAULT,
  );
} finally {
  if (prev === undefined) delete process.env.NEXT_PUBLIC_ASSET_LIFECYCLE_V1;
  else process.env.NEXT_PUBLIC_ASSET_LIFECYCLE_V1 = prev;
}

console.log("asset-lifecycle-v1-flag.test.ts OK");
