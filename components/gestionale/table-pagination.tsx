"use client";

import { erpFocus } from "@/components/gestionale/lavorazioni/lavorazioni-shared";
import { dsBtnNeutral, dsPageToolbarBtn } from "@/lib/ui/design-system";

type Props = {
  page: number;
  pageCount: number;
  onPageChange: (p: number) => void;
  label: string;
  className?: string;
};

function visibleNumberedPages(page: number, pageCount: number) {
  if (pageCount <= 1) {
    return {
      mid: [1],
      showFirst: false,
      showFirstGap: false,
      showLast: false,
      showLastGap: false,
    };
  }
  const maxSpan = 5;
  if (pageCount <= maxSpan) {
    const mid = Array.from({ length: pageCount }, (_, i) => i + 1);
    return { mid, showFirst: false, showFirstGap: false, showLast: false, showLastGap: false };
  }
  const delta = 2;
  let start = page - delta;
  let end = page + delta;
  if (start < 1) {
    end += 1 - start;
    start = 1;
  }
  if (end > pageCount) {
    start -= end - pageCount;
    end = pageCount;
  }
  start = Math.max(1, start);
  const mid: number[] = [];
  for (let i = start; i <= end; i += 1) mid.push(i);
  const first = mid[0]!;
  const last = mid[mid.length - 1]!;
  return {
    mid,
    showFirst: first > 1,
    showFirstGap: first > 2,
    showLast: last < pageCount,
    showLastGap: last < pageCount - 1,
  };
}

const pageBtnBase = `${dsBtnNeutral} min-h-9 min-w-9 shrink-0 px-0 text-xs font-semibold sm:min-h-9 sm:min-w-9`;
const pageBtnActive =
  "border-[color:color-mix(in_srgb,var(--cab-primary)_55%,var(--cab-border))] bg-[color:color-mix(in_srgb,var(--cab-primary)_12%,var(--cab-surface))] text-[color:color-mix(in_srgb,var(--cab-primary)_92%,var(--cab-text))] ring-1 ring-[color:color-mix(in_srgb,var(--cab-primary)_28%,transparent)]";

export function TablePagination({ page, pageCount, onPageChange, label, className }: Props) {
  if (pageCount <= 1) return null;

  const { mid, showFirst, showFirstGap, showLast, showLastGap } = visibleNumberedPages(page, pageCount);

  const iconBtn = `${pageBtnBase} text-base leading-none sm:text-sm`;
  const mobileStepBtn = `${dsPageToolbarBtn} h-11 min-h-11 w-full touch-manipulation sm:hidden`;

  return (
    <div
      className={`flex min-w-0 max-w-full flex-col gap-3 border-t border-[color:var(--cab-border)] px-2 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:flex-row sm:items-center sm:justify-between sm:gap-2 sm:pb-3 ${className ?? ""}`}
    >
      <p className="text-center text-xs leading-snug text-[color:var(--cab-text-muted)] sm:text-left">{label}</p>

      <nav
        className="grid w-full grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 sm:hidden"
        aria-label="Paginazione"
      >
        <button
          type="button"
          className={`${mobileStepBtn} ${erpFocus}`}
          aria-label="Pagina precedente"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          ‹ Prec.
        </button>
        <span className="inline-flex h-11 min-w-[4.5rem] shrink-0 items-center justify-center rounded-[var(--ds-radius-lg)] border border-[color:var(--cab-border)] bg-[var(--cab-surface)] px-3 text-sm font-semibold tabular-nums text-[color:var(--cab-text)] shadow-[var(--cab-shadow-sm)]">
          {page}
          <span className="mx-1 text-[color:var(--cab-text-muted)]">/</span>
          {pageCount}
        </span>
        <button
          type="button"
          className={`${mobileStepBtn} ${erpFocus}`}
          aria-label="Pagina successiva"
          disabled={page >= pageCount}
          onClick={() => onPageChange(page + 1)}
        >
          Succ. ›
        </button>
      </nav>

      <nav
        className="hidden min-w-0 shrink-0 flex-wrap items-center justify-end gap-1 sm:flex"
        aria-label="Paginazione"
      >
        <button
          type="button"
          className={`${iconBtn} ${erpFocus}`}
          aria-label="Prima pagina"
          disabled={page <= 1}
          onClick={() => onPageChange(1)}
        >
          ≪
        </button>
        <button
          type="button"
          className={`${iconBtn} ${erpFocus}`}
          aria-label="Pagina precedente"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          ‹
        </button>
        {showFirst ? (
          <button type="button" className={`${pageBtnBase} ${erpFocus}`} onClick={() => onPageChange(1)}>
            1
          </button>
        ) : null}
        {showFirstGap ? <span className="px-0.5 text-xs text-[color:var(--cab-text-muted)]">…</span> : null}
        {mid.map((p) => (
          <button
            key={p}
            type="button"
            className={`${pageBtnBase} ${erpFocus} ${p === page ? pageBtnActive : ""}`}
            aria-current={p === page ? "page" : undefined}
            onClick={() => onPageChange(p)}
          >
            {p}
          </button>
        ))}
        {showLastGap ? <span className="px-0.5 text-xs text-[color:var(--cab-text-muted)]">…</span> : null}
        {showLast ? (
          <button type="button" className={`${pageBtnBase} ${erpFocus}`} onClick={() => onPageChange(pageCount)}>
            {pageCount}
          </button>
        ) : null}
        <button
          type="button"
          className={`${iconBtn} ${erpFocus}`}
          aria-label="Pagina successiva"
          disabled={page >= pageCount}
          onClick={() => onPageChange(page + 1)}
        >
          ›
        </button>
        <button
          type="button"
          className={`${iconBtn} ${erpFocus}`}
          aria-label="Ultima pagina"
          disabled={page >= pageCount}
          onClick={() => onPageChange(pageCount)}
        >
          ≫
        </button>
      </nav>
    </div>
  );
}
