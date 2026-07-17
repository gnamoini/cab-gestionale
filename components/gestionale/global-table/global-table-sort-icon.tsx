import { globalTableSortIconWrap, type GlobalTableSortPhase } from "@/lib/ui/global-table";

/** Chevron su/giù impilati: evidenzia la direzione attiva (asc/desc), entrambi attenuati se inattivo. */
export function GlobalTableSortIcon({
  active,
  phase,
  className,
}: {
  active: boolean;
  phase: GlobalTableSortPhase;
  /** Es. `self-center` su header a due righe (`labelLines`). */
  className?: string;
}) {
  const upOpacity = !active ? 0.78 : phase === "asc" ? 1 : 0.28;
  const downOpacity = !active ? 0.78 : phase === "desc" ? 1 : 0.28;

  return (
    <span className={className ? `${globalTableSortIconWrap} ${className}` : globalTableSortIconWrap} aria-hidden>
    <svg
      className="h-full w-full text-current"
      viewBox="0 0 12 12"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path
        d="M2.5 4.25 6 1.75 9.5 4.25"
        className="transition-opacity duration-150"
        style={{ opacity: upOpacity }}
      />
      <path
        d="M2.5 7.75 6 10.25 9.5 7.75"
        className="transition-opacity duration-150"
        style={{ opacity: downOpacity }}
      />
    </svg>
    </span>
  );
}
