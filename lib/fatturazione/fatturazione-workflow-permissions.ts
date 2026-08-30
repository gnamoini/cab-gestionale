export const FATTURAZIONE_WORKFLOW_ACTIONS = [
  "emit",
  "approve",
  "cancel",
  "register_payment",
  "send_sdi",
  "export",
] as const;

export type FatturazioneWorkflowAction = (typeof FATTURAZIONE_WORKFLOW_ACTIONS)[number];

/** Fase 1: write abilita tutte le azioni operative. */
export function canFatturazioneWorkflowAction(canWrite: boolean): boolean {
  return canWrite;
}
