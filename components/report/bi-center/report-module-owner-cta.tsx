"use client";

import Link from "next/link";
import { listReadyModuleCtas } from "@/lib/report/legacy/report-data-ownership";

/** CTA verso modulo proprietario — solo destinazioni readiness READY. */
export function ReportModuleOwnerCta({ owner }: { owner: string }) {
  const entry = listReadyModuleCtas().find((e) => e.owner === owner);
  if (!entry?.moduleCta) return null;
  return (
    <p className="mt-3 text-xs">
      <Link
        href={entry.moduleCta.href}
        className="font-medium text-[color:var(--cab-primary)] underline underline-offset-2"
      >
        {entry.moduleCta.label} →
      </Link>
    </p>
  );
}
