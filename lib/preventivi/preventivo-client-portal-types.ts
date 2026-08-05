import type { PreventivoAcceptanceStatus } from "@/lib/preventivi/preventivo-acceptance-status";

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
  acceptanceStatus: PreventivoAcceptanceStatus;
  timeline: ClientPreventivoTimelineEntry[];
  streamPath: string;
  previewPath: string;
  descrizioneCliente: string;
  righeCount: number;
};
