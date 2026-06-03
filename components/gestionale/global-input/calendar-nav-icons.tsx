type CalendarIconProps = { className?: string };

function mergeIconClass(base: string, className?: string): string {
  return className ? `${base} ${className}` : base;
}

const navChevronSize = "h-4 w-4 shrink-0";
const downChevronSize = "h-3.5 w-3.5 shrink-0";
const todayIconSize = "h-4 w-4 shrink-0";

export function CalendarNavChevronLeft({ className }: CalendarIconProps) {
  return (
    <svg
      className={mergeIconClass(navChevronSize, className)}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
    </svg>
  );
}

export function CalendarNavChevronRight({ className }: CalendarIconProps) {
  return (
    <svg
      className={mergeIconClass(navChevronSize, className)}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  );
}

export function CalendarNavChevronDown({ className }: CalendarIconProps) {
  return (
    <svg
      className={mergeIconClass(downChevronSize, className)}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  );
}

export function CalendarTodayIcon({ className }: CalendarIconProps) {
  return (
    <svg
      className={mergeIconClass(todayIconSize, className)}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
      />
    </svg>
  );
}
