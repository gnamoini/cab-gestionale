"use client";

import { dsFocus } from "@/lib/ui/design-system";

type Props = {
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  id?: string;
  label?: string;
};

export function SecurityToggle({ checked, onChange, disabled, id, label }: Props) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={`relative inline-flex h-6 w-10 shrink-0 items-center rounded-full transition-colors duration-200 ease-out ${dsFocus} ${
        disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"
      } ${checked ? "bg-[color:var(--cab-primary)]" : "bg-zinc-300 dark:bg-zinc-600"}`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ease-out ${
          checked ? "translate-x-[1.125rem]" : "translate-x-1"
        }`}
        aria-hidden
      />
    </button>
  );
}
