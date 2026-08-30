"use client";

import type { ReactNode } from "react";

export function ReceivingReviewSplitLayout({
  preview,
  review,
}: {
  preview: ReactNode;
  review: ReactNode;
}) {
  return (
    <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-2 min-w-0">
      <div className="min-h-[280px] lg:min-h-0">{preview}</div>
      <div className="min-h-0 overflow-auto">{review}</div>
    </div>
  );
}
