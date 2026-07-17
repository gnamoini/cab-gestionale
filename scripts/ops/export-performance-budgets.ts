import { PERFORMANCE_BUDGETS } from "@/lib/performance/performance-budget-registry";
import {
  DEFAULT_WEB_VITALS_BUDGET,
  GLOBAL_FIRST_LOAD_JS_KB,
  GLOBAL_VENDOR_CHUNK_KB,
} from "@/lib/performance/performance-global-budgets";

process.stdout.write(
  JSON.stringify(
    {
      version: 2,
      global: {
        firstLoadJsKb: GLOBAL_FIRST_LOAD_JS_KB,
        vendorChunkKb: GLOBAL_VENDOR_CHUNK_KB,
        webVitals: DEFAULT_WEB_VITALS_BUDGET,
      },
      budgets: PERFORMANCE_BUDGETS,
    },
    null,
    2,
  ),
);
