"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  QueryClient,
  QueryClientProvider,
  onlineManager,
  type MutationCacheNotifyEvent,
  type QueryCacheNotifyEvent,
} from "@tanstack/react-query";
import { useToastContext } from "@/context/toast-context";

import { PWA_QUERY_CLIENT_DEFAULTS, shouldRefetchPwaGroupOnReconnect, type PwaQueryGroup } from "@/lib/pwa/pwa-query-policy";
import { installLongSessionDevHook } from "@/lib/observability/long-session-dev-hook";
import { isBootInvestigationEnabled } from "@/lib/observability/boot-investigation-gate";
import { loadBootInvestigationMod } from "@/lib/observability/boot-investigation-lazy";
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
      pushRef.current(message, "error", 5600);
    };

    // ponytail: solo mutation — le query in background (dashboard KPI, prefetch) gestiscono empty/error in UI
    const um = client.getMutationCache().subscribe((ev: MutationCacheNotifyEvent) => {
      if (ev.type !== "updated") return;
      const m = ev.mutation;
      if (!m) return;
      if (m.state.status !== "error" || !m.state.error) return;
      if (!isPermissionDeniedError(m.state.error)) return;
      maybePush(`m:${String(m.options.mutationKey ?? "mutation")}`, formatSupabaseError(m.state.error));
    });

    return () => {
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
          queries: {
            staleTime: PWA_QUERY_CLIENT_DEFAULTS.staleTime,
            gcTime: PWA_QUERY_CLIENT_DEFAULTS.gcTime,
            retry: PWA_QUERY_CLIENT_DEFAULTS.retry,
            refetchOnWindowFocus: PWA_QUERY_CLIENT_DEFAULTS.refetchOnWindowFocus,
            refetchOnReconnect: PWA_QUERY_CLIENT_DEFAULTS.refetchOnReconnect,
          },
          mutations: { retry: 0, networkMode: "online" },
        },
      }),
  );

  useEffect(() => {
    installLongSessionDevHook(client);
    if (process.env.NEXT_PUBLIC_PERF_DIAGNOSTICS === "1" || process.env.NEXT_PUBLIC_BENCH_EXPOSE_QUERY === "1") {
      (window as Window & { __GESTIONALE_QUERY_CLIENT__?: QueryClient }).__GESTIONALE_QUERY_CLIENT__ = client;
    }

    onlineManager.setEventListener((setOnline) => {
      const sync = () => setOnline(navigator.onLine);
      window.addEventListener("online", sync);
      window.addEventListener("offline", sync);
      sync();
      return () => {
        window.removeEventListener("online", sync);
        window.removeEventListener("offline", sync);
      };
    });

    const unsubPwaReconnect = onlineManager.subscribe((isOnline) => {
      if (!isOnline) return;
      void client.refetchQueries({
        type: "active",
        predicate: (query) => {
          const group = (query.meta as { pwaQueryGroup?: PwaQueryGroup } | undefined)?.pwaQueryGroup;
          if (group) return shouldRefetchPwaGroupOnReconnect(group);
          const opts = query.options as { refetchOnReconnect?: boolean };
          return opts.refetchOnReconnect ?? PWA_QUERY_CLIENT_DEFAULTS.refetchOnReconnect;
        },
      });
    });

    const cleanupOnline = () => {
      unsubPwaReconnect();
      onlineManager.setEventListener(() => undefined);
    };

    if (!isBootInvestigationEnabled()) {
      return cleanupOnline;
    }

    let unsubQuery: (() => void) | undefined;
    void loadBootInvestigationMod().then((mod) => {
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
          mod.trackQueryEvent("fetch_start", q.queryKey, meta);
        } else if (q.state.status === "error" && q.state.error) {
          mod.trackQueryEvent("fetch_error", q.queryKey, {
            ...meta,
            error: q.state.error instanceof Error ? q.state.error.message : String(q.state.error),
          });
        } else if (q.state.status === "success" && e.type === "updated") {
          mod.trackQueryEvent("fetch_success", q.queryKey, meta);
        } else {
          mod.trackQueryEvent("cache_updated", q.queryKey, meta);
        }
      };
      unsubQuery = client.getQueryCache().subscribe(onQuery);
    });

    return () => {
      unsubQuery?.();
      cleanupOnline();
    };
  }, [client]);

  return (
    <QueryClientProvider client={client}>
      <QueryErrorToasts client={client} />
      {children}
    </QueryClientProvider>
  );
}
