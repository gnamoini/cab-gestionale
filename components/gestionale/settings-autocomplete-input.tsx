"use client";

import { useMemo, useRef, useState } from "react";
import { dsInput } from "@/lib/ui/design-system";

function norm(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function scoreOption(query: string, option: string): number {
  const q = norm(query);
  const o = norm(option);
  if (!q) return 1;
  if (o === q) return 100;
  if (o.startsWith(q)) return 80 - Math.abs(o.length - q.length) / 10;
  if (o.includes(q)) return 55 - o.indexOf(q);
  let qi = 0;
  for (const ch of o) {
    if (ch === q[qi]) qi += 1;
    if (qi >= q.length) return 30 - Math.abs(o.length - q.length) / 10;
  }
  return 0;
}

export function SettingsAutocompleteInput({
  value,
  onChange,
  options,
  disabled,
  required,
  placeholder,
  className = "",
}: {
  value: string;
  onChange: (value: string) => void;
  options: readonly string[];
  disabled?: boolean;
  required?: boolean;
  placeholder?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suggestions = useMemo(() => {
    const unique = [...new Set(options.map((x) => x.trim()).filter(Boolean))];
    return unique
      .map((option) => ({ option, score: scoreOption(value, option) }))
      .filter((x) => x.score > 0 && norm(x.option) !== norm(value))
      .sort((a, b) => b.score - a.score || a.option.localeCompare(b.option, "it"))
      .slice(0, 6)
      .map((x) => x.option);
  }, [options, value]);

  return (
    <div className={`relative ${className}`}>
      <input
        className={dsInput}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          blurTimer.current = setTimeout(() => setOpen(false), 120);
        }}
        disabled={disabled}
        required={required}
        placeholder={placeholder}
        autoComplete="off"
      />
      {open && suggestions.length > 0 ? (
        <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-48 overflow-y-auto rounded-lg border border-[color:var(--cab-border)] bg-[var(--cab-card)] py-1 shadow-lg gestionale-scrollbar">
          {suggestions.map((option) => (
            <button
              key={option}
              type="button"
              className="block w-full px-3 py-2 text-left text-xs font-medium text-[color:var(--cab-text)] hover:bg-[var(--cab-hover)]"
              onMouseDown={(e) => {
                e.preventDefault();
                if (blurTimer.current) clearTimeout(blurTimer.current);
                onChange(option);
                setOpen(false);
              }}
            >
              {option}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
