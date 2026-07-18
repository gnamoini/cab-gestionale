"use client";

import Link from "next/link";
import type { InventoryReceivingPendingItem } from "@/lib/inventory-receiving/documents/inventory-receiving-pending-types";
import { inventoryReceivingUiStatusLabel } from "@/lib/inventory-receiving/documents/inventory-receiving-ui-status";
import { dsBtnNeutral } from "@/lib/ui/design-system";

type Props = {
  items: InventoryReceivingPendingItem[];
  onResumeImportFile?: (importFileId: string) => void;
  onResumeDocument?: (documentId: string) => void;
  onDismissImportFile?: (importFileId: string) => void;
  className?: string;
};

export function InventoryReceivingPendingBanner({
  items,
  onResumeImportFile,
  onResumeDocument,
  onDismissImportFile,
  className = "",
}: Props) {
  if (!items.length) return null;

  return (
    <div
      className={`rounded-lg border border-amber-300/60 bg-amber-50/80 p-3 text-sm dark:border-amber-700/50 dark:bg-amber-950/30 ${className}`.trim()}
    >
      <p className="font-medium text-amber-900 dark:text-amber-100">Analisi DDT in sospeso</p>
      <ul className="mt-2 space-y-2">
        {items.map((item) => (
          <li key={`${item.kind}-${item.id}`} className="flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0">
              <span className="font-medium">{item.label}</span>
              <span className="ml-2 text-xs text-[color:var(--cab-text-muted)]">
                {inventoryReceivingUiStatusLabel(item.uiStatus)}
              </span>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {item.kind === "document" && item.documentId ? (
                <Link
                  href={`/magazzino/carichi/nuovo?documentId=${item.documentId}`}
                  className={`${dsBtnNeutral} text-xs`}
                >
                  Riprendi
                </Link>
              ) : item.importFileId && onResumeImportFile ? (
                <button
                  type="button"
                  className={`${dsBtnNeutral} text-xs`}
                  onClick={() => onResumeImportFile(item.importFileId!)}
                >
                  Riprendi
                </button>
              ) : null}
              {item.importFileId && onDismissImportFile ? (
                <button
                  type="button"
                  className="text-xs text-[color:var(--cab-text-muted)] underline"
                  onClick={() => onDismissImportFile(item.importFileId!)}
                >
                  Annulla
                </button>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
