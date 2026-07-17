import { getActiveBudgetExceptions } from "@/lib/performance/performance-budget-exceptions";

process.stdout.write(JSON.stringify({ exceptions: getActiveBudgetExceptions() }, null, 2));
