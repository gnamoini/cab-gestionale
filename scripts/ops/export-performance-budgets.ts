import { PERFORMANCE_BUDGETS } from "@/lib/performance/performance-budget-registry";

process.stdout.write(JSON.stringify({ version: 1, budgets: PERFORMANCE_BUDGETS }, null, 2));
