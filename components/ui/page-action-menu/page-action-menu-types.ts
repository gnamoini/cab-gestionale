import type { ReactNode } from "react";
import type { GestionalePermissionModule } from "@/src/lib/permissions/gestionale-modules";
import type { GestionalePageKey } from "@/src/lib/permissions/gestionale-pages";

export type PageActionItemToggle = {
  checked: boolean;
  onChange: (checked: boolean) => void;
};

export type PageActionItem = {
  id: string;
  label: string;
  description?: string;
  icon?: ReactNode;
  onSelect?: () => void;
  href?: string;
  /** Evidenzia voce con novità / notifica — contribuisce al pallino sul trigger ⋮. */
  attention?: boolean;
  badge?: string | number;
  shortcut?: string;
  chevron?: boolean;
  submenu?: PageActionItem[];
  toggle?: PageActionItemToggle;
  loading?: boolean;
  disabled?: boolean;
  disabledReason?: string;
  danger?: boolean;
  hidden?: boolean;
  /** Etichetta sezione sopra il gruppo (primo item del gruppo). */
  sectionLabel?: string;
  pageKey?: GestionalePageKey;
  requireWrite?: boolean;
  module?: GestionalePermissionModule;
  featureFlag?: () => boolean;
  adminOnly?: boolean;
};

export type PageActionMenuGroup = {
  group: string;
  order: number;
  items: PageActionItem[];
};

export type PageActionMenuBackConfig = {
  href: string;
  label: string;
};

export type UsePageActionMenuOptions = {
  group?: string;
  order?: number;
  deps?: readonly unknown[];
};

export type PageActionMenuProviderProps = {
  children: ReactNode;
  back?: PageActionMenuBackConfig | null;
  /** Pallino sul trigger se true (es. notifiche non lette nel menu). */
  menuAttention?: boolean;
};

export type PageActionMenuProps = {
  items?: PageActionItem[];
  back?: PageActionMenuBackConfig | null;
  className?: string;
  headerActions?: ReactNode;
  /** Pallino sul trigger ⋮ — override esplicito; default da `attention`/`badge` sulle voci. */
  menuAttention?: boolean;
};
