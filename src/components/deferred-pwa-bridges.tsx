"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/auth-context";

const PwaCoreBridgePack = dynamic(() => import("@/src/components/pwa-core-bridge-pack"), { ssr: false });

/**
 * PWA bridge core — montati dopo init auth (non blocking login paint).
 */
export function DeferredPwaBridges() {
  const { status } = useAuth();
  const authInitDone = status !== "loading";
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (!authInitDone) {
      setMounted(false);
      return;
    }
    const id = requestAnimationFrame(() => setMounted(true));
    return () => {
      cancelAnimationFrame(id);
      setMounted(false);
    };
  }, [authInitDone]);

  if (!mounted) return null;
  return <PwaCoreBridgePack />;
}
