import type { ReactNode } from "react";
import { contentRevealClass } from "./loading-tokens";

export type ContentRevealProps = {
  children: ReactNode;
  className?: string;
  "data-testid"?: string;
};

/** Wrapper neutro — fade opacity al mount via .cab-content-reveal (no remount children). */
export function ContentReveal({ children, className = "", "data-testid": testId }: ContentRevealProps) {
  const merged = [contentRevealClass, className].filter(Boolean).join(" ");
  return (
    <div className={merged} {...(testId ? { "data-testid": testId } : {})}>
      {children}
    </div>
  );
}

export type LoadingExclusiveContentProps = {
  loading: boolean;
  skeleton: ReactNode;
  children: ReactNode;
  className?: string;
  "data-testid"?: string;
};

/** Stato esclusivo drawer/modale: skeleton O contenuto con reveal (policy loading). */
export function LoadingExclusiveContent({
  loading,
  skeleton,
  children,
  className,
  "data-testid": testId,
}: LoadingExclusiveContentProps) {
  if (loading) {
    return <>{skeleton}</>;
  }
  return (
    <ContentReveal className={className} data-testid={testId}>
      {children}
    </ContentReveal>
  );
}
