"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import type { AskReportConversationContext, AskReportResponse } from "@/lib/report/ask-report/types";
import { useReportPeriodContext } from "@/components/report/context/report-period-context";
import { ymdFromDate } from "@/lib/report/date-ranges";

type AskMessage = { role: "user" | "assistant"; content: string; response?: AskReportResponse };

type ReportAskContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
  messages: AskMessage[];
  loading: boolean;
  error: string | null;
  sendMessage: (message: string) => Promise<void>;
  conversationId?: string;
  conversationContext?: AskReportConversationContext;
};

const ReportAskContext = createContext<ReportAskContextValue | null>(null);

export function useReportAsk() {
  const ctx = useContext(ReportAskContext);
  if (!ctx) throw new Error("useReportAsk requires ReportAskProvider");
  return ctx;
}

export function useOptionalReportAsk() {
  return useContext(ReportAskContext);
}

export function ReportAskProvider({ children }: { children: ReactNode }) {
  const { range, compareMode, preset } = useReportPeriodContext();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<AskMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string>();
  const [conversationContext, setConversationContext] = useState<AskReportConversationContext>();

  const defaultPeriod = useMemo(
    () => ({
      preset,
      start: ymdFromDate(range.start),
      end: ymdFromDate(range.end),
      compareMode,
    }),
    [preset, range.start, range.end, compareMode],
  );

  const sendMessage = useCallback(
    async (message: string) => {
      setLoading(true);
      setError(null);
      setMessages((prev) => [...prev, { role: "user", content: message }]);
      try {
        const res = await fetch("/api/report/ask-report", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            conversationId,
            message,
            conversationContext: conversationContext ?? {
              period: defaultPeriod,
              compareMode,
            },
            period: defaultPeriod,
            compareMode,
          }),
        });
        if (!res.ok) {
          const err = (await res.json().catch(() => ({}))) as { message?: string };
          throw new Error(err.message ?? `Errore ${res.status}`);
        }
        const data = (await res.json()) as AskReportResponse & { requestId?: string };
        setConversationId(data.conversationId);
        setConversationContext(data.conversationContext);
        setMessages((prev) => [...prev, { role: "assistant", content: data.answer, response: data }]);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Errore");
      } finally {
        setLoading(false);
      }
    },
    [conversationId, conversationContext, defaultPeriod, compareMode],
  );

  const value = useMemo(
    () => ({
      open,
      setOpen,
      messages,
      loading,
      error,
      sendMessage,
      conversationId,
      conversationContext,
    }),
    [open, messages, loading, error, sendMessage, conversationId, conversationContext],
  );

  return <ReportAskContext.Provider value={value}>{children}</ReportAskContext.Provider>;
}
