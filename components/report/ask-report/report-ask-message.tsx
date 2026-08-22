"use client";

import { ReportAskCitation } from "@/components/report/ask-report/report-ask-citation";

type Message = {
  role: "user" | "assistant";
  content: string;
  response?: import("@/lib/report/ask-report/types").AskReportResponse;
};

function parseAnswerBody(content: string): { summary: string; keyPoints: string[] } {
  const marker = /DATI CHIAVE/i;
  const idx = content.search(marker);
  if (idx < 0) return { summary: content.trim(), keyPoints: [] };

  const summary = content.slice(0, idx).trim();
  const keySection = content.slice(idx).replace(marker, "").trim();
  const keyPoints = keySection
    .split(/\n/)
    .map((line) => line.replace(/^[\s•\-–]+/, "").trim())
    .filter(Boolean);

  return { summary, keyPoints };
}

function ChatAvatar({ role }: { role: "user" | "assistant" }) {
  const isUser = role === "user";
  return (
    <div
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${
        isUser
          ? "bg-[color:var(--cab-accent)] text-white"
          : "border border-[color:var(--cab-border)] bg-[color:var(--cab-surface-muted)] text-[color:var(--cab-text-muted)]"
      }`}
      aria-hidden
    >
      {isUser ? "Tu" : "AI"}
    </div>
  );
}

export function ReportAskMessage({
  message,
  onFollowUp,
}: {
  message: Message;
  onFollowUp?: (text: string) => void;
}) {
  const isUser = message.role === "user";
  const { summary, keyPoints } = isUser
    ? { summary: message.content, keyPoints: [] as string[] }
    : parseAnswerBody(message.content);

  return (
    <div
      className={`flex gap-2.5 ${isUser ? "flex-row-reverse" : "flex-row"}`}
      data-testid="report-ask-message"
    >
      <ChatAvatar role={message.role} />

      <div className={`min-w-0 max-w-[85%] space-y-2 ${isUser ? "items-end" : "items-start"}`}>
        <div
          className={`rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed shadow-sm ${
            isUser
              ? "rounded-br-md bg-[color:var(--cab-accent)] text-white"
              : "rounded-bl-md border border-[color:var(--cab-border)] bg-[color:color-mix(in_srgb,var(--cab-surface-muted)_40%,var(--cab-card))] text-[color:var(--cab-text)]"
          }`}
        >
          <p className="whitespace-pre-wrap">{summary}</p>

          {!isUser && keyPoints.length > 0 ? (
            <div className="mt-3 border-t border-[color:color-mix(in_srgb,var(--cab-border)_70%,transparent)] pt-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[color:var(--cab-text-muted)]">
                Dati chiave
              </p>
              <ul className="mt-1.5 space-y-1">
                {keyPoints.map((point) => (
                  <li key={point} className="flex gap-2 text-xs leading-snug text-[color:var(--cab-text)]">
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[color:var(--cab-primary)]" aria-hidden />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        {!isUser && message.response?.citations?.length ? (
          <div className="flex flex-wrap gap-1.5">
            {message.response.citations.map((c) => (
              <ReportAskCitation key={`${c.type}-${c.id}`} citation={c} />
            ))}
          </div>
        ) : null}

        {!isUser && message.response?.followUps?.length ? (
          <div className="flex flex-wrap gap-1.5">
            {message.response.followUps.map((f) => (
              <button
                key={f.label}
                type="button"
                className="rounded-full border border-[color:var(--cab-border)] bg-[var(--cab-card)] px-2.5 py-1 text-[11px] font-medium text-[color:var(--cab-primary)] transition hover:bg-[color:var(--cab-surface-muted)]"
                onClick={() => onFollowUp?.(f.message)}
              >
                {f.label}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function ReportAskTypingIndicator() {
  return (
    <div className="flex gap-2.5" data-testid="report-ask-typing" aria-live="polite" aria-label="Risposta in corso">
      <ChatAvatar role="assistant" />
      <div className="rounded-2xl rounded-bl-md border border-[color:var(--cab-border)] bg-[color:color-mix(in_srgb,var(--cab-surface-muted)_40%,var(--cab-card))] px-4 py-3">
        <span className="flex items-center gap-1">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="h-1.5 w-1.5 animate-bounce rounded-full bg-[color:var(--cab-text-muted)]"
              style={{ animationDelay: `${i * 120}ms` }}
            />
          ))}
        </span>
      </div>
    </div>
  );
}
