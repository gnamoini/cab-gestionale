"use client";

import {
  isValidElement,
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { Tooltip } from "@/components/ui";
import {
  lavTablePillMinH,
  lavTablePillTextClass,
} from "@/components/gestionale/lavorazioni/lavorazioni-table-shared";
import { resolvePillTooltip } from "@/lib/ui/meaningful-tooltip";

function reactNodeText(node: ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(reactNodeText).join("");
  if (isValidElement(node)) return reactNodeText((node.props as { children?: ReactNode }).children);
  return "";
}

/** Pill colorata sola lettura (storico / kanban). */
export function TablePillReadonly({
  shellClass,
  shellStyle,
  title,
  children,
  fitContent = false,
}: {
  shellClass: string;
  shellStyle?: CSSProperties;
  title?: string;
  children: ReactNode;
  fitContent?: boolean;
}) {
  const textRef = useRef<HTMLSpanElement>(null);
  const [truncated, setTruncated] = useState(false);
  const visibleText = reactNodeText(children);
  const measure = useCallback(() => {
    const el = textRef.current;
    if (!el) return;
    setTruncated(el.scrollWidth > el.clientWidth + 1);
  }, []);

  useLayoutEffect(() => {
    measure();
    const el = textRef.current;
    if (!el) return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [visibleText, measure]);

  const tooltip = resolvePillTooltip(visibleText, title ?? visibleText, truncated);
  const widthClass = fitContent ? "w-fit max-w-none" : "min-w-0 max-w-[8.75rem]";
  const textClass = fitContent
    ? `min-w-0 flex-1 whitespace-nowrap ${lavTablePillTextClass} text-inherit`
    : `min-w-0 flex-1 truncate ${lavTablePillTextClass} text-inherit`;

  const pill = (
    <div className={`${shellClass} overflow-hidden ${widthClass}`} style={shellStyle}>
      <div className={`relative flex ${lavTablePillMinH} w-full items-center overflow-hidden rounded-[inherit] px-2 py-0.5`}>
        <span ref={textRef} className={textClass}>
          {children}
        </span>
      </div>
    </div>
  );

  return tooltip ? <Tooltip content={tooltip}>{pill}</Tooltip> : pill;
}
