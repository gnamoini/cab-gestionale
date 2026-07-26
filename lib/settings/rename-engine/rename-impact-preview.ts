import type { SupabaseClient } from "@/src/lib/supabase/browser-client";
import type { RenameImpactItem, RenamePlan } from "@/lib/settings/rename-engine/types";
import { resolveOperations } from "@/lib/settings/rename-engine/rename-operation-registry";
import { buildImpactFromCounts } from "@/lib/settings/rename-engine/rename-validate";

async function countColumnEq(
  c: SupabaseClient,
  table: string,
  column: string,
  value: string,
  extra?: { statusIn?: string[]; statusNotIn?: string[] },
): Promise<number> {
  let q = c.from(table).select("id", { count: "exact", head: true }).eq(column, value);
  if (extra?.statusIn?.length) q = q.in("status", extra.statusIn);
  if (extra?.statusNotIn?.length) q = q.not("status", "in", `(${extra.statusNotIn.join(",")})`);
  const { count, error } = await q;
  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function previewRenameImpact(c: SupabaseClient, plan: RenamePlan) {
  const ops = resolveOperations(plan.operationIds);
  const items: RenameImpactItem[] = [];

  for (const op of ops) {
    if (op.policy === "protected") {
      let protectedCount = 0;
      if (op.action === "replace_column" && op.column) {
        protectedCount = await countColumnEq(c, op.table, op.column, plan.oldLabel, {
          statusNotIn: op.filter.statusIn ? undefined : op.filter.statusNotIn,
          statusIn: op.filter.statusIn,
        });
      }
      items.push({
        operationId: op.id,
        table: op.table,
        policy: "protected",
        updatable: 0,
        protected: protectedCount,
        total: protectedCount,
      });
      continue;
    }

    let updatable = 0;
    if (op.action === "replace_column" && op.column) {
      updatable = await countColumnEq(c, op.table, op.column, plan.oldLabel, {
        statusIn: op.filter.statusIn,
        statusNotIn: op.filter.statusNotIn,
      });
    } else if (op.action === "custom" || op.action === "replace_json" || op.action === "insert_alias") {
      // ponytail: custom/json counts approximated at execute time; preview marks as pending
      updatable = 0;
    }

    const protectedCount =
      op.filter.statusNotIn && op.column
        ? await countColumnEq(c, op.table, op.column, plan.oldLabel, { statusNotIn: op.filter.statusNotIn })
        : 0;

    items.push({
      operationId: op.id,
      table: op.table,
      policy: op.policy,
      updatable,
      protected: protectedCount,
      total: updatable + protectedCount,
    });
  }

  return buildImpactFromCounts(items);
}
