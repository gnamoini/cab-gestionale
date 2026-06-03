"use client";

import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { Tooltip } from "@/components/design-system/tooltip";
import type { TooltipSide } from "@/lib/ui/tooltip-portal";

/** Tooltip con testo completo solo se `truncate` taglia il contenuto. */
export function TruncatedTextTooltip({
  text,
  className,
  side = "top",
  delayMs = 220,
}: {
  text: string;
  className?: string;
  side?: TooltipSide;
  delayMs?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [isTruncated, setIsTruncated] = useState(false);

  const measure = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setIsTruncated(el.scrollWidth > el.clientWidth + 1);
  }, []);

  useLayoutEffect(() => {
    measure();
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [text, measure]);

  const line = (
    <div ref={ref} className={className} title={undefined}>
      {text}
    </div>
  );

  if (!isTruncated || !text.trim()) {
    return line;
  }

  return (
    <Tooltip content={text} side={side} showOnFocus={false} delayMs={delayMs}>
      {line}
    </Tooltip>
  );
}
