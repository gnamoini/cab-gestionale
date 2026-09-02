"use client";

import { dsFocus } from "@/lib/ui/design-system";
import {
  PREVENTIVO_CATEGORIA_OPTIONS,
  type PreventivoCategoria,
} from "@/lib/preventivi/preventivo-categoria";

function PreventivoCategoriaIcon({ categoria }: { categoria: PreventivoCategoria }) {
  if (categoria === "vendita") {
    return (
      <svg className="h-6 w-6 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3 3h2l.4 2M7 13h10l3-8H6.4M7 13L5.4 5M7 13l-1.5 6M17 13l1.5 6M9.5 21a1.5 1.5 0 100-3 1.5 1.5 0 000 3zm8 0a1.5 1.5 0 100-3 1.5 1.5 0 000 3z"
        />
      </svg>
    );
  }
  return (
    <svg className="h-6 w-6 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z"
      />
    </svg>
  );
}

export function PreventivoCategoriaPicker({
  onSelect,
}: {
  onSelect: (categoria: PreventivoCategoria) => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2" role="listbox" aria-label="Tipo di preventivo">
      {PREVENTIVO_CATEGORIA_OPTIONS.map((option) => (
        <button
          key={option.id}
          type="button"
          role="option"
          className={`group flex min-h-[11rem] flex-col rounded-xl border border-[color:var(--cab-border)] bg-[color:var(--cab-surface)] p-4 text-left shadow-[var(--cab-shadow-sm)] transition-colors hover:border-[color:color-mix(in_srgb,var(--cab-primary)_45%,var(--cab-border))] hover:bg-[color:color-mix(in_srgb,var(--cab-primary)_6%,var(--cab-surface))] ${dsFocus}`}
          onClick={() => onSelect(option.id)}
        >
          <div className="flex items-start gap-3">
            <span
              className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${
                option.id === "vendita"
                  ? "bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-200"
                  : "bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-200"
              }`}
            >
              <PreventivoCategoriaIcon categoria={option.id} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-[color:var(--cab-text)]">{option.title}</p>
              <p className="text-xs font-medium text-[color:var(--cab-text-muted)]">{option.subtitle}</p>
            </div>
          </div>
          <p className="mt-3 text-sm leading-snug text-[color:var(--cab-text-muted)]">{option.description}</p>
          <ul className="mt-3 space-y-1 text-xs text-[color:var(--cab-text-muted)]">
            {option.highlights.map((line) => (
              <li key={line} className="flex gap-2">
                <span className="text-[color:var(--cab-primary)]" aria-hidden>
                  ·
                </span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </button>
      ))}
    </div>
  );
}
