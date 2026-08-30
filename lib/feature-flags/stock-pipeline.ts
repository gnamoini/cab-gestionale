/**
 * Stock pipeline v4 — active by default.
 * Solo `false` disabilita; legacy = kill switch emergenza.
 */

/** Client: journal, queue, display state. Default ON. */
export function isStockPipelineClientEnabled(): boolean {
  const v = process.env.NEXT_PUBLIC_STOCK_PIPELINE_V3;
  return v !== "false";
}

/** Server: enforcement operation_id / stock engine. Default ON. */
export function isStockPipelineServerEnabled(): boolean {
  const v = process.env.STOCK_PIPELINE_V3_SERVER;
  return v !== "false";
}

/** Ops kill switch — forza percorso legacy esplicito. */
export function isStockPipelineEmergencyFallback(): boolean {
  return process.env.STOCK_PIPELINE_EMERGENCY === "true";
}

/** Percorso ufficiale v4 attivo su client. */
export function isDeterministicStockPipelineActive(): boolean {
  return isStockPipelineClientEnabled() && !isStockPipelineEmergencyFallback();
}

/** @deprecated use isDeterministicStockPipelineActive — non è un React hook */
export const useDeterministicStockPipeline = isDeterministicStockPipelineActive;
