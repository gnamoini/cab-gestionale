"use client";

import { useState } from "react";
import { erpFocus } from "@/components/gestionale/lavorazioni/lavorazioni-shared";

export const SETTINGS_LIST_ROW =
  "group flex min-h-[2.75rem] items-center justify-between gap-2 rounded-lg px-2 py-1.5 transition-colors duration-150 hover:bg-[color:color-mix(in_srgb,var(--cab-primary)_7%,var(--cab-surface))] dark:hover:bg-zinc-800/70";

export const SETTINGS_LIST_INPUT =
  "min-w-0 flex-1 rounded-lg border border-transparent bg-transparent px-1.5 py-1 text-xs font-medium text-zinc-800 outline-none transition-[border-color,background-color,box-shadow] duration-150 focus:border-[color:color-mix(in_srgb,var(--cab-primary)_55%,var(--cab-border))] focus:bg-white focus:ring-2 focus:ring-[color:color-mix(in_srgb,var(--cab-primary)_25%,transparent)] dark:text-zinc-100 dark:focus:bg-zinc-950";

export const SETTINGS_LIST_ACTION =
  "shrink-0 rounded-md px-2 py-1 text-xs font-medium opacity-70 transition-opacity duration-150 group-hover:opacity-100";

function IconPencil({ className = "" }: { className?: string }) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 7.125L16.862 4.487" />
    </svg>
  );
}

export function SettingsEditableStringRow({
  value,
  onRenameBlur,
  onRemove,
  trailing,
}: {
  value: string;
  onRenameBlur: (previous: string, next: string) => void;
  onRemove: () => void;
  trailing?: React.ReactNode;
}) {
  const [editing, setEditing] = useState(false);

  return (
    <li className={SETTINGS_LIST_ROW}>
      {editing ? (
        <input
          className={SETTINGS_LIST_INPUT}
          defaultValue={value}
          autoFocus
          aria-label={`Modifica ${value}`}
          onBlur={(e) => {
            setEditing(false);
            onRenameBlur(value, e.target.value);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
            if (e.key === "Escape") {
              setEditing(false);
            }
          }}
        />
      ) : (
        <span className="min-w-0 flex-1 truncate px-1.5 text-xs font-medium text-zinc-800 dark:text-zinc-100">{value}</span>
      )}
      {trailing}
      <div className="flex shrink-0 items-center gap-0.5">
        <button
          type="button"
          className={`${SETTINGS_LIST_ACTION} text-zinc-600 hover:text-[color:var(--cab-primary)] dark:text-zinc-300 dark:hover:text-[color:var(--cab-primary)] ${erpFocus}`}
          title="Modifica"
          aria-label={`Modifica ${value}`}
          onClick={() => setEditing(true)}
        >
          <IconPencil />
        </button>
        <button
          type="button"
          className={`${SETTINGS_LIST_ACTION} text-red-600 hover:underline dark:text-red-400 ${erpFocus}`}
          onClick={onRemove}
        >
          Elimina
        </button>
      </div>
    </li>
  );
}
