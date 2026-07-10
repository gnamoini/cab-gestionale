"use client";

import type { ReactElement } from "react";
import { Tooltip, type TooltipProps } from "./tooltip";

export type OptionalTooltipProps = Omit<TooltipProps, "children" | "content"> & {
  content?: string;
  children: ReactElement;
};

/** Wrap condizionale — nessun tooltip se content vuoto. */
export function OptionalTooltip({ content, children, ...rest }: OptionalTooltipProps) {
  if (!content?.trim()) return children;
  return (
    <Tooltip content={content} {...rest}>
      {children}
    </Tooltip>
  );
}
