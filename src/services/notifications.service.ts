"use client";

import type {
  CreateNotificationInput,
  CreateNotificationResult,
  InboxCursor,
  InboxNotificationRow,
} from "@/lib/notifications/notification-types";
import { getBrowserSupabase } from "@/src/lib/supabase/browser-client";
import { err, success, type ServiceResult } from "@/src/services/service-result";
import { serviceFailFromError } from "@/src/utils/supabaseErrorHandler";

const DEFAULT_PAGE_SIZE = 50;

function mapInboxRow(raw: Record<string, unknown>): InboxNotificationRow {
  return raw as unknown as InboxNotificationRow;
}

async function sb() {
  return getBrowserSupabase();
}

async function withRetry<T>(fn: () => Promise<T>, retries = 2, delays = [500, 1500]): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn();
    } catch (e) {
      lastError = e;
      if (i < retries) await new Promise((r) => setTimeout(r, delays[i] ?? 1500));
    }
  }
  throw lastError;
}

export const notificationsService = {
  async create(input: CreateNotificationInput): Promise<ServiceResult<CreateNotificationResult>> {
    try {
      const client = await sb();
      const { data, error } = await client.rpc("cab_create_notification", {
        p_type: input.type,
        p_title: input.title,
        p_body: input.body,
        p_href: input.href ?? null,
        p_entity_type: input.entity_type ?? null,
        p_entity_id: input.entity_id ?? null,
        p_dedup_key: input.dedup_key,
      });
      if (error) return err(error.message);
      const row = Array.isArray(data) ? data[0] : data;
      if (!row || typeof row !== "object") return err("Risposta RPC non valida");
      const r = row as { id?: string | null; inserted?: boolean };
      return success({ id: r.id ?? null, inserted: Boolean(r.inserted) });
    } catch (e) {
      return serviceFailFromError(e);
    }
  },

  async countUnread(): Promise<ServiceResult<number>> {
    try {
      const count = await withRetry(async () => {
        const client = await sb();
        const { data, error } = await client.rpc("cab_count_unread_notifications");
        if (error) throw new Error(error.message);
        return Number(data ?? 0);
      });
      return success(count);
    } catch (e) {
      return serviceFailFromError(e);
    }
  },

  async listInbox(options?: {
    limit?: number;
    cursor?: InboxCursor | null;
  }): Promise<ServiceResult<InboxNotificationRow[]>> {
    try {
      const rows = await withRetry(async () => {
        const client = await sb();
        const { data, error } = await client.rpc("cab_list_notifications_inbox", {
          p_limit: options?.limit ?? DEFAULT_PAGE_SIZE,
          p_cursor_priority_rank: options?.cursor?.priority_rank ?? null,
          p_cursor_created_at: options?.cursor?.created_at ?? null,
          p_cursor_id: options?.cursor?.id ?? null,
        });
        if (error) throw new Error(error.message);
        return (data ?? []) as Record<string, unknown>[];
      });
      return success(rows.map(mapInboxRow));
    } catch (e) {
      return serviceFailFromError(e);
    }
  },

  async markRead(notificationId: string): Promise<ServiceResult<boolean>> {
    try {
      const client = await sb();
      const { error } = await client.rpc("cab_mark_notification_read", {
        p_notification_id: notificationId,
      });
      if (error) return err(error.message);
      return success(true);
    } catch (e) {
      return serviceFailFromError(e);
    }
  },

  async markAllRead(maxBatch = 200): Promise<ServiceResult<number>> {
    try {
      const client = await sb();
      const { data, error } = await client.rpc("cab_mark_all_notifications_read", {
        p_max: maxBatch,
      });
      if (error) return err(error.message);
      return success(Number(data ?? 0));
    } catch (e) {
      return serviceFailFromError(e);
    }
  },

  async dismiss(notificationId: string): Promise<ServiceResult<boolean>> {
    try {
      const client = await sb();
      const { error } = await client.rpc("cab_dismiss_notification", {
        p_notification_id: notificationId,
      });
      if (error) return err(error.message);
      return success(true);
    } catch (e) {
      return serviceFailFromError(e);
    }
  },
};
