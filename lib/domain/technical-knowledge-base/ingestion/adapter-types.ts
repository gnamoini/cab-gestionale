import type { SupabaseClient } from "@supabase/supabase-js";
import type { TkbBuildMode, TkbChangeHint } from "../types";

export type TkbIngestionContext = {
  supabase: SupabaseClient;
  mode: TkbBuildMode;
  hints?: TkbChangeHint[];
  now: string;
  warnings: string[];
  excluded: { deleted: number; inactive: number; invalid: number; rbacDenied: number };
};

export function createIngestionContext(
  supabase: SupabaseClient,
  mode: TkbBuildMode,
  hints?: TkbChangeHint[],
): TkbIngestionContext {
  return {
    supabase,
    mode,
    hints,
    now: new Date().toISOString(),
    warnings: [],
    excluded: { deleted: 0, inactive: 0, invalid: 0, rbacDenied: 0 },
  };
}
