"use client";

import { memo, type ReactNode } from "react";
import { Button } from "@/components/design-system/button";
import { dsTypoBody, dsTypoSmall } from "@/lib/ui/design-system";

export type LoadingErrorStateProps = {
  title: string;
  description?: string;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
  children?: ReactNode;
};

export const LoadingErrorState = memo(function LoadingErrorState({
  title,
  description,
  onRetry,
  retryLabel = "Riprova",
  className = "",
  children,
}: LoadingErrorStateProps) {
  return (
    <div
      role="alert"
      className={`flex min-w-0 flex-col items-center justify-center gap-2 px-4 py-8 text-center ${className}`.trim()}
    >
      <p className={`${dsTypoBody} font-semibold text-[color:var(--cab-text)]`}>{title}</p>
      {description ? (
        <p className={`${dsTypoSmall} max-w-md text-[color:var(--cab-text-muted)]`}>{description}</p>
      ) : null}
      {children}
      {onRetry ? (
        <Button type="button" variant="secondary" size="sm" className="mt-2" onClick={onRetry}>
          {retryLabel}
        </Button>
      ) : null}
    </div>
  );
});
