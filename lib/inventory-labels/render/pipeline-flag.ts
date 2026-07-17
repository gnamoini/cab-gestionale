/** V2: text-paths + sharp raster + fallback chain. `0`/`false` → legacy fontconfig path. */
export function isInventoryLabelPdfPipelineV2(): boolean {
  const v = process.env.INVENTORY_LABEL_PDF_PIPELINE_V2?.trim().toLowerCase();
  if (v === "0" || v === "false") return false;
  return true;
}
