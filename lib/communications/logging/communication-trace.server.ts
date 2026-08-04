export type CommunicationTraceEvent = {
  event: string;
  templateKey: string;
  recipient: string;
  actualRecipient: string;
  mode: string;
  attachments: number;
  durationMs?: number;
  status: string;
  retryCount?: number;
  messageId?: string;
};

export function traceCommunicationEvent(evt: CommunicationTraceEvent): void {
  console.info("[CommunicationEvent]", JSON.stringify(evt));
}
