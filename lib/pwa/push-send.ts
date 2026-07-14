/** Contratto Edge Function push — nessun invio dal browser. */

export type PushDeliveryClaimRow = {
  id: string;
  notification_id: string;
  status: string;
  attempts: number;
  max_attempts: number;
};

export type PushSendRequest = {
  delivery_id: string;
};

export const PUSH_DELIVERY_MAX_ATTEMPTS_DEFAULT = 5;

export const PUSH_RETRY_BASE_SECONDS = 60;

export type ProcessPushDeliveryResult = {
  ok: boolean;
  processed?: number;
  skipped?: string;
  error?: string;
};
