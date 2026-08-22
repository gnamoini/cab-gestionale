"use client";

import { useEffect, useRef, useState } from "react";
import { Drawer } from "@/components/design-system";
import { resolveDrawerAsideClasses } from "@/lib/ui/modal-size-system";
import { useReportAsk } from "@/components/report/ask-report/report-ask-provider";
import { ReportAskMessage, ReportAskTypingIndicator } from "@/components/report/ask-report/report-ask-message";
import { ReportAskInput } from "@/components/report/ask-report/report-ask-input";
import { ReportAskEmptyState } from "@/components/report/ask-report/report-ask-empty-state";

const QUICK_PROMPTS = [
  "Come sta andando l'azienda?",
  "Quanto abbiamo fatturato nel periodo?",
  "Quante fatture sono già scadute?",
  "Perché è cambiato il margine?",
  "Quali clienti stanno peggiorando?",
  "Quali lavorazioni sono oltre il termine previsto?",
  "Quali sono le principali criticità?",
  "Quali decisioni sono aperte?",
];

export function ReportAskPanel() {
  const { open, setOpen, messages, loading, error, sendMessage } = useReportAsk();
  const [draft, setDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, loading]);

  const onSubmit = async () => {
    const text = draft.trim();
    if (!text || loading) return;
    setDraft("");
    await sendMessage(text);
  };

  return (
    <Drawer
      open={open}
      onClose={() => setOpen(false)}
      title="Chiedi al Report"
      asideClassName={resolveDrawerAsideClasses("drawerLog")}
      data-testid="report-ask-panel"
    >
      <div className="flex h-full min-h-0 flex-col">
        <div
          ref={scrollRef}
          className="gestionale-scrollbar min-h-0 flex-1 space-y-4 overflow-y-auto px-1 py-2"
        >
          {messages.length === 0 && !loading ? (
            <ReportAskEmptyState prompts={QUICK_PROMPTS} onSelect={(p) => void sendMessage(p)} />
          ) : (
            messages.map((m, i) => (
              <ReportAskMessage
                key={i}
                message={m}
                onFollowUp={(text) => void sendMessage(text)}
              />
            ))
          )}
          {loading ? <ReportAskTypingIndicator /> : null}
          {error ? (
            <p className="rounded-lg border border-[color:color-mix(in_srgb,var(--cab-danger)_35%,var(--cab-border))] bg-[color:color-mix(in_srgb,var(--cab-danger)_8%,var(--cab-card))] px-3 py-2 text-xs text-[color:var(--cab-danger)]">
              {error}
            </p>
          ) : null}
        </div>

        <ReportAskInput value={draft} onChange={setDraft} onSubmit={() => void onSubmit()} disabled={loading} />
      </div>
    </Drawer>
  );
}
