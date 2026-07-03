import type { TkbIngestionContext } from "./adapter-types";
import type { TkbChangeHint, TkbSourceFragment } from "../types";

export interface TkbSourceAdapter {
  readonly id: string;
  readonly tier: 1 | 2 | 3 | 4;
  readonly supportsIncremental: boolean;
  collect(ctx: TkbIngestionContext): Promise<TkbSourceFragment[]>;
  collectIncremental?(ctx: TkbIngestionContext, hints: TkbChangeHint[]): Promise<TkbSourceFragment[]>;
}

const adapters: TkbSourceAdapter[] = [];

export function registerTkbAdapter(adapter: TkbSourceAdapter): void {
  if (adapters.some((a) => a.id === adapter.id)) {
    throw new Error(`TKB adapter già registrato: ${adapter.id}`);
  }
  adapters.push(adapter);
}

/** Ordine tier (strutturato prima); la precedenza conflitti è nel MergeEngine. */
export function listTkbAdapters(): readonly TkbSourceAdapter[] {
  return [...adapters].sort((a, b) => a.tier - b.tier || a.id.localeCompare(b.id));
}

export function resetTkbAdaptersForTest(): void {
  adapters.length = 0;
}

export async function collectFromAllAdapters(ctx: TkbIngestionContext): Promise<TkbSourceFragment[]> {
  const out: TkbSourceFragment[] = [];
  for (const adapter of listTkbAdapters()) {
    const t0 = Date.now();
    try {
      let frags: TkbSourceFragment[];
      if (ctx.mode === "incremental" && adapter.supportsIncremental && adapter.collectIncremental && ctx.hints?.length) {
        frags = await adapter.collectIncremental(ctx, ctx.hints);
      } else {
        frags = await adapter.collect(ctx);
      }
      out.push(...frags);
      ctx.warnings.push(`adapter:${adapter.id}:ok:${frags.length}:${Date.now() - t0}ms`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      ctx.warnings.push(`adapter:${adapter.id}:fail:${msg}`);
    }
  }
  return out;
}
