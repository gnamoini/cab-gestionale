"use client";

import { Fragment, useMemo } from "react";
import { normalizeEntityString } from "@/lib/validation/global-entity-validation";

/** Evidenzia corrispondenze query nel testo opzione (case/accent insensitive). */
export function HighlightSearchMatch({
  text,
  query,
  className = "rounded-sm bg-[color:var(--cab-primary)] px-0.5 font-semibold text-black",
}: {
  text: string;
  query: string;
  className?: string;
}) {
  const parts = useMemo(() => splitHighlightParts(text, query), [text, query]);
  if (!query.trim() || parts.length <= 1) return <>{text}</>;
  return (
    <>
      {parts.map((part, i) =>
        part.match ? (
          <mark key={i} className={className}>
            {part.text}
          </mark>
        ) : (
          <Fragment key={i}>{part.text}</Fragment>
        ),
      )}
    </>
  );
}

type HighlightPart = { text: string; match: boolean };

function splitHighlightParts(text: string, query: string): HighlightPart[] {
  const q = query.trim();
  if (!q) return [{ text, match: false }];

  const normText = normalizeEntityString(text);
  const normQ = normalizeEntityString(q);
  if (!normQ || !normText.includes(normQ)) return [{ text, match: false }];

  const parts: HighlightPart[] = [];
  let cursor = 0;
  let searchFrom = 0;

  while (searchFrom < text.length) {
    const slice = text.slice(searchFrom);
    const normSlice = normalizeEntityString(slice);
    const idx = normSlice.indexOf(normQ);
    if (idx < 0) {
      parts.push({ text: text.slice(cursor), match: false });
      break;
    }
    const start = searchFrom + idx;
    const end = start + q.length;
    if (start > cursor) parts.push({ text: text.slice(cursor, start), match: false });
    parts.push({ text: text.slice(start, end), match: true });
    cursor = end;
    searchFrom = end;
  }

  return parts.length ? parts : [{ text, match: false }];
}
