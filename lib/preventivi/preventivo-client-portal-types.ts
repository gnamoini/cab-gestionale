import type { PreventivoStatoWorkflow } from "@/lib/preventivi/types";

export type ClientPreventivoTimelineEntry = {
  at: string;
  label: string;
  eventType: string;
};

export type ClientPreventivoPortalPayload = {
  preventivoId: string;
  numero: string;
  versione: number;
  totale: number;
  inviatoAt: string | null;
  workflowStatus: PreventivoStatoWorkflow;
  displayLabel: string;
  timeline: ClientPreventivoTimelineEntry[];
  streamPath: string;
  previewPath: string;
  descrizioneCliente: string;
  righeCount: number;
};
