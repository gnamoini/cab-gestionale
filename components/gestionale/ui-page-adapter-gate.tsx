"use client";

import dynamic from "next/dynamic";
import type { UIPageAdapterProps } from "@/lib/ui-os/ui-backward-adapter";

const UIPageAdapterLazy = dynamic(
  () => import("@/lib/ui-os/ui-backward-adapter").then((m) => m.UIPageAdapter),
);

/** Loads UI OS adapter only when `NEXT_PUBLIC_CAB_UI_OS=1`; otherwise passthrough. */
export function UIPageAdapterGate(props: UIPageAdapterProps) {
  if (process.env.NEXT_PUBLIC_CAB_UI_OS !== "1") {
    return <>{props.children}</>;
  }
  return <UIPageAdapterLazy {...props} />;
}
