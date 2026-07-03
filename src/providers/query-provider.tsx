"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  QueryClient,
  QueryClientProvider,
  type MutationCacheNotifyEvent,
  type QueryCacheNotifyEvent,
} from "@tanstack/react-query";
import { useToastContext } from "@/context/toast-context";

import { installLongSessionDevHook } from "@/lib/observability/long-session-dev-hook";
import { isBootInvestigationEnabled, trackQueryEvent } from "@/lib/observability/boot-investigation";
import { useBootInvestigationMount } from "@/lib/observability/use-boot-investigation-mount";
import { formatSupabaseError, isPermissionDeniedError } from "@/src/utils/supabaseErrorHandler";

function QueryErrorToasts({ client }: { client: QueryClient }) {
  const { push } = useToastContext();
  const pushRef = useRef(push);

  useEffect(() => {
    pushRef.current = push;
  }, [push]);

  useEffect(() => {
    const last = new Map<string, number>();
    const maybePush = (key: string, message: string) => {
      const now = Date.now();
      if ((last.get(key) ?? 0) > now - 5000) return;
      last.set(key, now);
      pushRef.current(message, "warning", 5600);
    };

    const onQuery = (e: QueryCacheNotifyEvent) => {
      if (e.type !== "updated") return;
      const q = e.query;
      if (q.state.status !== "error" || !q.state.error) return;
      if (!isPermissionDeniedError(q.state.error)) return;
      maybePush(`q:${JSON.stringify(q.queryKey)}`, formatSupabaseError(q.state.error));
    };

    const uq = client.getQueryCache().subscribe(onQuery);
    const um = client.getMutationCache().subscribe((ev: MutationCacheNotifyEvent) => {
      if (ev.type !== "updated") return;
      const m = ev.mutation;
      if (!m) return;
      if (m.state.status !== "error" || !m.state.error) return;
      if (!isPermissionDeniedError(m.state.error)) return;
      maybePush(`m:${String(m.options.mutationKey ?? "mutation")}`, formatSupabaseError(m.state.error));
    });

    return () => {
      uq();
      um();
    };
  }, [client]);

  return null;
}

export function QueryProvider({ children }: { children: ReactNode }) {
  useBootInvestigationMount("QueryProvider");
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 30_000, gcTime: 300_000, retry: 1 },
          mutations: { retry: 0 },
        },
      }),
  );

  useEffect(() => {
    installLongSessionDevHook(client);
    if (!isBootInvestigationEnabled()) return;

    const onQuery = (e: QueryCacheNotifyEvent) => {
      if (e.type !== "added" && e.type !== "updated" && e.type !== "removed") return;
      const q = e.query;
      const meta = {
        status: q.state.status,
        fetchStatus: q.state.fetchStatus,
        dataUpdatedAt: q.state.dataUpdatedAt,
        errorUpdatedAt: q.state.errorUpdatedAt,
        eventType: e.type,
      };
      if (q.state.fetchStatus === "fetching") {
        trackQueryEvent("fetch_start", q.queryKey, meta);
      } else if (q.state.status === "error" && q.state.error) {
        trackQueryEvent("fetch_error", q.queryKey, {
          ...meta,
          error: q.state.error instanceof Error ? q.state.error.message : String(q.state.error),
        });
      } else if (q.state.status === "success" && e.type === "updated") {
        trackQueryEvent("fetch_success", q.queryKey, meta);
      } else {
        trackQueryEvent("cache_updated", q.queryKey, meta);
      }
    };

    const unsub = client.getQueryCache().subscribe(onQuery);
    return () => unsub();
  }, [client]);

  return (
    <QueryClientProvider client={client}>
      <QueryErrorToasts client={client} />
      {children}
    </QueryClientProvider>
  );
}
