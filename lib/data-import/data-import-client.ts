"use client";

import type { ImportEntity, ImportExecuteResult, ImportFieldDef, ImportMappingConfig } from "@/lib/data-import/core/types";
import type { ImportStrategy } from "@/lib/data-import/core/import-plugin";
import { routeSlugForEntity } from "@/lib/data-import/import-registry-client";
import { openSafePopup } from "@/lib/browser/popup-guard";

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify(body),
  });
  const data = (await res.json()) as T & { error?: string };
  if (!res.ok) throw new Error(data.error ?? "Richiesta non riuscita.");
  return data;
}

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Lettura file non riuscita."));
    reader.readAsDataURL(file);
  });
}

export type ImportParseResponse = {
  sheets: Array<{ index: number; name: string; rowCount: number; columnCount: number }>;
  warnings: string[];
  fileName: string;
  suggestedMapping: ImportMappingConfig;
  fields: ImportFieldDef[];
};

export type ImportPreviewResponse = {
  batchId: string;
  fileName: string;
  fields: ImportFieldDef[];
  rows: Array<Record<string, unknown>>;
  stats: {
    total: number;
    valid: number;
    warnings: number;
    errors: number;
    duplicates: number;
    truncated: boolean;
  };
  warnings: string[];
  suggestedStrategy?: ImportStrategy;
};

function entityBase(entity: ImportEntity) {
  return `/api/import/${routeSlugForEntity(entity)}`;
}

export async function parseImportFile(entity: ImportEntity, fileName: string, fileBase64: string, sheetIndex = 0) {
  return postJson<ImportParseResponse>(`${entityBase(entity)}/parse`, { fileName, fileBase64, sheetIndex });
}

export async function previewImport(
  entity: ImportEntity,
  input: {
    fileName: string;
    fileBase64: string;
    mapping: ImportMappingConfig;
    duplicateDefaultAction?: string;
    strategy?: ImportStrategy;
  },
) {
  return postJson<ImportPreviewResponse>(`${entityBase(entity)}/preview`, input);
}

export async function executeImport(entity: ImportEntity, body: Record<string, unknown>) {
  return postJson<ImportExecuteResult>(`${entityBase(entity)}/execute`, body);
}

export function downloadImportTemplate(entity: ImportEntity) {
  const url = `${entityBase(entity)}/template`;
  openSafePopup({ url, context: "export", label: "template import" });
}

export async function fetchImportBatches(entity?: ImportEntity) {
  const q = entity ? `?entity=${encodeURIComponent(entity)}` : "";
  const res = await fetch(`/api/import/batches${q}`, { credentials: "same-origin" });
  const data = (await res.json()) as { batches?: unknown[]; error?: string };
  if (!res.ok) throw new Error(data.error ?? "Caricamento storico non riuscito.");
  return data.batches ?? [];
}

export async function fetchImportMappingPresets(entity: ImportEntity) {
  const res = await fetch(`/api/import/presets?entity=${encodeURIComponent(entity)}`, { credentials: "same-origin" });
  const data = (await res.json()) as { presets?: Array<{ id: string; name: string; mapping: ImportMappingConfig }>; error?: string };
  if (!res.ok) throw new Error(data.error ?? "Caricamento preset non riuscito.");
  return data.presets ?? [];
}

export async function saveImportMappingPreset(entity: ImportEntity, name: string, mapping: ImportMappingConfig) {
  return postJson<{ preset: unknown }>("/api/import/presets", { entity, name, mapping });
}

export function downloadEntityExport(entity: ImportEntity, format: "csv" | "xlsx" = "csv") {
  const slug = routeSlugForEntity(entity);
  openSafePopup({
    url: `/api/export/${slug}?format=${format}`,
    context: "export",
    label: "export dati",
  });
}
