"use client";

/**
 * UI OS Renderer — schema-driven shell wrapper (Phase 2).
 */

import { useMemo, type ReactNode } from "react";
import {
  LAYOUT_SHELL_MAP,
  MODAL_SHELL_MAP,
  TABLE_SHELL_MAP,
  TOOLBAR_SHELL_MAP,
} from "@/lib/ui-os/ui-layout-shells";
import type { UIOsRenderPrimary } from "@/lib/ui-os/ui-render-decision";
import {
  DEFAULT_PAGE_SCHEMA,
  type UIPageSchema,
} from "@/lib/ui-os/ui-schema";

export type UIRendererSlots = {
  toolbar?: ReactNode;
  table?: ReactNode;
  modal?: ReactNode;
  children?: ReactNode;
};

export type UIRendererProps = {
  schema: UIPageSchema;
  pageId: string;
  slots: UIRendererSlots;
  primary?: UIOsRenderPrimary;
};

export function UIRenderer({ schema, pageId, slots, primary = "legacy" }: UIRendererProps) {
  const merged = useMemo(
    () => ({ ...DEFAULT_PAGE_SCHEMA, ...schema }),
    [schema],
  );

  const LayoutShell = LAYOUT_SHELL_MAP[merged.layout ?? "gestionale-core"];
  const ToolbarShell = TOOLBAR_SHELL_MAP[merged.toolbar ?? "standard"];
  const TableShell = TABLE_SHELL_MAP[merged.table ?? "global"];
  const ModalShell = MODAL_SHELL_MAP[merged.modal ?? "ds"];

  const body = slots.children;
  const tableBlock = slots.table ? <TableShell slot={slots.table} /> : null;
  const modalBlock = slots.modal ? <ModalShell slot={slots.modal} /> : null;
  const toolbarBlock = slots.toolbar ? <ToolbarShell slot={slots.toolbar} /> : null;

  return (
    <LayoutShell>
      <div
        className="contents"
        data-ui-os-page={pageId}
        data-ui-os-primary={primary}
        data-ui-os-active={primary === "os" ? "1" : "0"}
      >
        {toolbarBlock}
        {tableBlock}
        {modalBlock}
        {body}
      </div>
    </LayoutShell>
  );
}
