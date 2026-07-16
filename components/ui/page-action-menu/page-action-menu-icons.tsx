import type { ReactNode } from "react";

const iconClass = "h-4 w-4 shrink-0";

function Svg({ children, className = iconClass }: { children: ReactNode; className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
      {children}
    </svg>
  );
}

export function PageActionIconLog({ className = iconClass }: { className?: string }) {
  return (
    <Svg className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
    </Svg>
  );
}

export function PageActionIconUndo({ className = iconClass }: { className?: string }) {
  return (
    <Svg className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 14L4 9l5-5M4 9h10.5a5.5 5.5 0 010 11H11" />
    </Svg>
  );
}

export function PageActionIconLabels({ className = iconClass }: { className?: string }) {
  return (
    <Svg className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" />
    </Svg>
  );
}

export function PageActionIconDelete({ className = iconClass }: { className?: string }) {
  return (
    <Svg className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3m-9 0h10" />
    </Svg>
  );
}

export function PageActionIconRefresh({ className = iconClass }: { className?: string }) {
  return (
    <Svg className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </Svg>
  );
}

export function PageActionIconTemplate({ className = iconClass }: { className?: string }) {
  return (
    <Svg className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3M4 7v10a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2H6a2 2 0 00-2 2z" />
    </Svg>
  );
}
