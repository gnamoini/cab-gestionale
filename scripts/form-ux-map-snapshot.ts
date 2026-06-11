/**
 * Append daily MAP burndown snapshot.
 * Usage: npx tsx scripts/form-ux-map-snapshot.ts
 */
import { writeBurndownSnapshot } from "@/lib/form-ux-migration/form-ux-legacy-burndown";

const file = writeBurndownSnapshot();
console.log(`MAP burndown snapshot written: ${file}`);
