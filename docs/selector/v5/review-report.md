# Selector v5 Promotion Review Report

_Generated at 2026-06-10T16:58:51.971Z_

> Offline intelligence proposes; humans approve. Engine config is **not** auto-modified.

## Manual deployment checklist

After approving a proposal, a human operator must manually apply changes to
`lib/selector-core/selector-engine-config.ts` — never via automated promotion.

## Proposals

### prop-addetti-1 (addetti)

- **Status:** proposed
- **Confidence:** 1.00
- **Sample size:** 11
- **Risk:** medium — sample size 11 below 20

**Current vs proposed:**

```json
{
  "currentPreferred": {
    "totalOpens": 11,
    "surfaceCounts": {
      "dropdown": 10,
      "sheet": 0,
      "searchableDropdown": 1
    },
    "bucketCounts": {
      "2-5": 0,
      "6-20": 1,
      "20-100": 9,
      "100+": 1
    },
    "searchUsageRate": 1,
    "sheetUsageRate": 0,
    "dropdownRate": 0.9090909090909091,
    "fallbackRate": 0,
    "avgDecisionLatencyMs": 2.3181818181818183,
    "mobileRate": 0.9090909090909091,
    "dropdownAbandonRate": null
  },
  "proposedChange": {
    "surfacePreference": "sheet",
    "rolloutAdjustment": "ENABLED"
  }
}
```

**Supporting insights:**
- searchUsageRate 100.0% with dominant dropdown
- large option buckets with search-heavy dropdown usage
**Offline A/B simulation (estimated):**

- Simulation recommendation: **favor_proposed**
- Search efficiency: 0.091 → 1.000
- Fallback reduction potential: 0.0%

