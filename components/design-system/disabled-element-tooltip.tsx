"use client";

import type { ReactElement } from "react";
import { Tooltip, type TooltipProps } from "./tooltip";

export type DisabledElementTooltipProps = Omit<TooltipProps, "children"> & {
  children: ReactElement;
  /** Quando true, wrappa in span per permettere hover tooltip su button disabled */
  disabled?: boolean;
};

/** Tooltip su controlli disabled — wrap span per eventi pointer. */
export function DisabledElementTooltip({
  content,
  disabled = false,
  children,
  ...rest
}: DisabledElementTooltipProps) {
  const wrapped = disabled ? (
    <span className="inline-flex w-full min-w-0">{children}</span>
  ) : (
    children
  );
  return (
    <Tooltip content={content} {...rest}>
      {wrapped}
    </Tooltip>
  );
}
