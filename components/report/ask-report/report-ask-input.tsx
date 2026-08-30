"use client";

import { useRef } from "react";
import { GestionaleTextarea } from "@/components/gestionale/gestionale-textarea";

export function ReportAskInput({
  value,
  onChange,
  onSubmit,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const focusInput = () => {
    queueMicrotask(() => textareaRef.current?.focus());
  };

  const handleSubmit = () => {
    if (disabled || !value.trim()) return;
    onSubmit();
    focusInput();
  };

  return (
    <form
      className="border-t border-[color:var(--cab-border)] bg-[var(--cab-card)] p-3"
      onSubmit={(e) => {
        e.preventDefault();
        handleSubmit();
      }}
    >
      <div className="flex items-end gap-2 rounded-2xl border border-[color:var(--cab-border)] bg-[color:color-mix(in_srgb,var(--cab-surface-muted)_25%,var(--cab-card))] p-2 shadow-sm focus-within:border-[color:color-mix(in_srgb,var(--cab-primary)_35%,var(--cab-border))]">
        <GestionaleTextarea
          ref={textareaRef}
          rows={1}
          size="sm"
          maxHeight="8rem"
          className={`min-h-[2.5rem] min-w-0 flex-1 !border-0 !bg-transparent !shadow-none px-2 py-1.5 text-sm leading-relaxed outline-none ${disabled ? "opacity-60" : ""}`}
          placeholder="Scrivi un messaggio…"
          value={value}
          onChange={onChange}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmit();
            }
          }}
          readOnly={disabled}
          autoCorrect="off"
          autoCapitalize="sentences"
          aria-disabled={disabled}
          aria-label="Domanda al report"
          data-testid="report-ask-input"
        />
        <button
          type="submit"
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[color:var(--cab-accent)] text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          disabled={disabled || !value.trim()}
          aria-label="Invia messaggio"
          data-testid="report-ask-submit"
        >
          ↑
        </button>
      </div>
      <p className="mt-2 text-center text-[10px] text-[color:var(--cab-text-muted)]">
        Invio per inviare · Maiusc+Invio per andare a capo
      </p>
    </form>
  );
}
