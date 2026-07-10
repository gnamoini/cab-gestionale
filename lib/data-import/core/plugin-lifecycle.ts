import type { PluginHooks, PluginHookContext } from "@/lib/data-import/core/plugin-definition";
import type { NormalizedDataset } from "@/lib/data-import/core/normalized-dataset";
import type { ExportScope } from "@/lib/data-import/core/plugin-definition";

const globalHooks: PluginHooks = {};

export function registerGlobalImportExportHooks(hooks: PluginHooks): void {
  Object.assign(globalHooks, hooks);
}

export async function runBeforeParse(
  ctx: PluginHookContext,
  pluginHooks?: PluginHooks,
): Promise<void> {
  await globalHooks.beforeParse?.(ctx);
  await pluginHooks?.beforeParse?.(ctx);
}

export async function runAfterParse(
  ctx: PluginHookContext,
  dataset: NormalizedDataset,
  pluginHooks?: PluginHooks,
): Promise<void> {
  await pluginHooks?.afterParse?.(ctx, dataset);
  await globalHooks.afterParse?.(ctx, dataset);
}

export async function runBeforeValidate(
  ctx: PluginHookContext,
  dataset: NormalizedDataset,
  pluginHooks?: PluginHooks,
): Promise<void> {
  await globalHooks.beforeValidate?.(ctx, dataset);
  await pluginHooks?.beforeValidate?.(ctx, dataset);
}

export async function runAfterValidate(
  ctx: PluginHookContext,
  preview: unknown,
  pluginHooks?: PluginHooks,
): Promise<void> {
  await pluginHooks?.afterValidate?.(ctx, preview);
  await globalHooks.afterValidate?.(ctx, preview);
}

export async function runBeforeExecute(
  ctx: PluginHookContext,
  decisions: unknown,
  pluginHooks?: PluginHooks,
): Promise<void> {
  await globalHooks.beforeExecute?.(ctx, decisions);
  await pluginHooks?.beforeExecute?.(ctx, decisions);
}

export async function runAfterExecute(
  ctx: PluginHookContext,
  result: unknown,
  pluginHooks?: PluginHooks,
): Promise<void> {
  await pluginHooks?.afterExecute?.(ctx, result);
  await globalHooks.afterExecute?.(ctx, result);
}

export async function runBeforeExport(
  ctx: PluginHookContext,
  scope: ExportScope,
  pluginHooks?: PluginHooks,
): Promise<void> {
  await globalHooks.beforeExport?.(ctx, scope);
  await pluginHooks?.beforeExport?.(ctx, scope);
}

export async function runAfterExport(
  ctx: PluginHookContext,
  buffer: Buffer,
  pluginHooks?: PluginHooks,
): Promise<void> {
  await pluginHooks?.afterExport?.(ctx, buffer);
  await globalHooks.afterExport?.(ctx, buffer);
}
