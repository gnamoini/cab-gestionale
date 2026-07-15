import type { ReactNode } from "react";
import { pageActionMenuFooterClass } from "@/lib/ui/page-action-menu-tokens";

export function PageActionMenuFooter({ children }: { children?: ReactNode }) {
  if (!children) return null;
  return <div className={pageActionMenuFooterClass}>{children}</div>;
}
