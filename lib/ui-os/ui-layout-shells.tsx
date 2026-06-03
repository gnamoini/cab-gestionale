"use client";

/**
 * UI OS layout shells — pass-through wrappers (display: contents).
 * No hardcoded view imports; schema-driven shell only.
 */

import type { ComponentType, ReactNode } from "react";
import type {
  LayoutVariant,
  ModalVariant,
  TableVariant,
  ToolbarVariant,
} from "@/lib/ui-os/ui-schema";

type ShellProps = { children?: ReactNode; slot?: ReactNode };

function contentsShell(
  dataAttr: string,
  dataValue: string,
): ComponentType<ShellProps> {
  return function Shell({ children, slot }: ShellProps) {
    const content = slot ?? children;
    return (
      <div className="contents" data-ui-os-shell={dataAttr} data-ui-os-variant={dataValue}>
        {content}
      </div>
    );
  };
}

export const ToolbarStandardShell = contentsShell("toolbar", "standard");
export const ToolbarCompactShell = contentsShell("toolbar", "dense");
export const ToolbarLegacyShell = contentsShell("toolbar", "legacy");

export const GlobalTableShell = contentsShell("table", "global");
export const LegacyTableShell = contentsShell("table", "legacy");

export const DsModalShell = contentsShell("modal", "ds");
export const GestionaleModalShell = contentsShell("modal", "gestionale-shell");
export const LegacyModalShell = contentsShell("modal", "legacy");

export function GestionaleCoreLayout({ children, slot }: ShellProps) {
  const content = slot ?? children;
  return (
    <div className="contents" data-ui-os-layout="gestionale-core">
      {content}
    </div>
  );
}

export function ReportDashboardLayout({ children, slot }: ShellProps) {
  const content = slot ?? children;
  return (
    <div className="contents" data-ui-os-layout="report-dashboard">
      {content}
    </div>
  );
}

export function LegacyLayoutShell({ children, slot }: ShellProps) {
  const content = slot ?? children;
  return (
    <div className="contents" data-ui-os-layout="legacy">
      {content}
    </div>
  );
}

export type UIShellComponent = ComponentType<ShellProps>;

export const TOOLBAR_SHELL_MAP: Record<ToolbarVariant, UIShellComponent> = {
  standard: ToolbarStandardShell,
  dense: ToolbarCompactShell,
  legacy: ToolbarLegacyShell,
};

export const TABLE_SHELL_MAP: Record<TableVariant, UIShellComponent> = {
  global: GlobalTableShell,
  legacy: LegacyTableShell,
};

export const MODAL_SHELL_MAP: Record<ModalVariant, UIShellComponent> = {
  ds: DsModalShell,
  "gestionale-shell": GestionaleModalShell,
  legacy: LegacyModalShell,
};

export const LAYOUT_SHELL_MAP: Record<LayoutVariant, UIShellComponent> = {
  "gestionale-core": GestionaleCoreLayout,
  "report-dashboard": ReportDashboardLayout,
  legacy: LegacyLayoutShell,
};

export function resolveToolbarShell(variant: ToolbarVariant): UIShellComponent {
  return TOOLBAR_SHELL_MAP[variant];
}

export function resolveTableShellComponent(variant: TableVariant): UIShellComponent {
  return TABLE_SHELL_MAP[variant];
}

export function resolveModalShellComponent(variant: ModalVariant): UIShellComponent {
  return MODAL_SHELL_MAP[variant];
}

export function resolveLayoutShellComponent(variant: LayoutVariant): UIShellComponent {
  return LAYOUT_SHELL_MAP[variant];
}
