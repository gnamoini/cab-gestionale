"use client";

import Link from "next/link";
import {
  SystemBannerLayout,
  SystemBannerShell,
} from "@/components/design-system/system-banner";
import { InventoryReceivingPendingBannerIcon } from "@/components/gestionale/magazzino/carichi/inventory-receiving-pending-banner-icon";
import {
  INVENTORY_RECEIVING_PENDING_BANNER_ARIA_LABEL,
  INVENTORY_RECEIVING_PENDING_BANNER_DESCRIPTION,
  INVENTORY_RECEIVING_PENDING_BANNER_DISMISS_LABEL,
  INVENTORY_RECEIVING_PENDING_BANNER_LIST_ARIA_LABEL,
  INVENTORY_RECEIVING_PENDING_BANNER_RESUME_LABEL,
  INVENTORY_RECEIVING_PENDING_BANNER_TITLE,
} from "@/lib/inventory-receiving/documents/inventory-receiving-pending-banner-copy";
import type { InventoryReceivingPendingItem } from "@/lib/inventory-receiving/documents/inventory-receiving-pending-types";
import { inventoryReceivingUiStatusLabel } from "@/lib/inventory-receiving/documents/inventory-receiving-ui-status";
import { dsSystemBannerChip, dsSystemBannerGhostBtn } from "@/lib/ui/design-system";

const pendingRowActionBtn = dsSystemBannerGhostBtn;

type Props = {
  items: InventoryReceivingPendingItem[];
  onResumeImportFile?: (importFileId: string) => void;
  onDismissPending?: (item: InventoryReceivingPendingItem) => void;
  /** Anteprima dev: Riprendi non naviga né chiama API. */
  previewMode?: boolean;
  className?: string;
};

export function InventoryReceivingPendingBanner({
  items,
  onResumeImportFile,
  onDismissPending,
  previewMode = false,
  className = "",
}: Props) {
  if (!items.length) return null;

  return (
    <SystemBannerShell
      ariaLabel={INVENTORY_RECEIVING_PENDING_BANNER_ARIA_LABEL}
      role="status"
      placement="embedded"
      className={className}
    >
      <SystemBannerLayout
        media={<InventoryReceivingPendingBannerIcon />}
        title={INVENTORY_RECEIVING_PENDING_BANNER_TITLE}
        description={INVENTORY_RECEIVING_PENDING_BANNER_DESCRIPTION}
      >
        <ul className="mt-3 space-y-2" aria-label={INVENTORY_RECEIVING_PENDING_BANNER_LIST_ARIA_LABEL}>
          {items.map((item) => (
            <li
              key={`${item.kind}-${item.id}`}
              className="flex flex-col gap-2 rounded-[var(--ds-radius-md)] border border-[color:color-mix(in_srgb,#ffffff_10%,transparent)] bg-[color:color-mix(in_srgb,#ffffff_4%,transparent)] p-2.5 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0 space-y-1.5">
                <p className="truncate text-sm font-medium text-[color:#fafafa]">{item.label}</p>
                <span className={dsSystemBannerChip}>{inventoryReceivingUiStatusLabel(item.uiStatus)}</span>
              </div>
              <div className="flex shrink-0 items-center gap-2 min-w-0 flex-nowrap sm:flex-wrap">
                {previewMode ? (
                  <button type="button" className={pendingRowActionBtn} disabled aria-disabled>
                    {INVENTORY_RECEIVING_PENDING_BANNER_RESUME_LABEL}
                  </button>
                ) : item.kind === "document" && item.documentId ? (
                  <Link
                    href={`/magazzino/carichi/nuovo?documentId=${item.documentId}`}
                    className={pendingRowActionBtn}
                  >
                    {INVENTORY_RECEIVING_PENDING_BANNER_RESUME_LABEL}
                  </Link>
                ) : item.importFileId && onResumeImportFile ? (
                  <button
                    type="button"
                    className={pendingRowActionBtn}
                    onClick={() => onResumeImportFile(item.importFileId!)}
                  >
                    {INVENTORY_RECEIVING_PENDING_BANNER_RESUME_LABEL}
                  </button>
                ) : null}
                {onDismissPending ? (
                  <button
                    type="button"
                    className="text-xs text-[color:#a1a1aa] underline-offset-2 hover:text-[color:#fafafa] hover:underline"
                    onClick={() => onDismissPending(item)}
                  >
                    {INVENTORY_RECEIVING_PENDING_BANNER_DISMISS_LABEL}
                  </button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      </SystemBannerLayout>
    </SystemBannerShell>
  );
}
