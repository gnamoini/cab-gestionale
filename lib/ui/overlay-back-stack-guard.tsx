"use client";

import { useLayoutEffect } from "react";
import {
  attachOverlayBackPopStateListener,
  healOverlayBackStack,
} from "@/lib/ui/overlay-back-stack";

/** Listener popstate singleton + heal su mount/pageshow. Montare una volta in AppProviders. */
export function OverlayBackStackGuard(): null {
  useLayoutEffect(() => {
    healOverlayBackStack("mount");
    const detach = attachOverlayBackPopStateListener();

    const onPageShow = () => healOverlayBackStack("pageshow");
    window.addEventListener("pageshow", onPageShow);

    return () => {
      detach();
      window.removeEventListener("pageshow", onPageShow);
    };
  }, []);

  return null;
}
