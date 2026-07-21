"use client";

import type { ReactElement } from "react";
import { Tooltip, type TooltipProps } from "./tooltip";

export type DisabledElementTooltipProps = Omit<TooltipProps, "children"> & {
  children: ReactElement;
  /** Quando true, wrappa in span per permettere hover tooltip su button disabled */
  disabled?: boolean;
};

/** Tooltip su controlli disabled — nessun tooltip se il controllo è attivo (evita duplicati sul label). */
export function DisabledElementTooltip({
  content,
  disabled = false,
  children,
  ...rest
}: DisabledElementTooltipProps) {
  if (!disabled) return children;

  return (
    <Tooltip content={content} {...rest}>
      <span className="flex w-full min-w-0 [&>button]:w-full">{children}</span>
    </Tooltip>
  );
}
