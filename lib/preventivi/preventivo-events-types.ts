export type PreventivoEventViewModel = {
  id: string;
  eventType: string;
  label: string;
  actorType: string;
  createdAt: string;
  payload: Record<string, unknown>;
  snapshot: Record<string, unknown>;
};
