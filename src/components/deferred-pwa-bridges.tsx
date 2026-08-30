"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/auth-context";

const PwaCoreBridgePack = dynamic(() => import("@/src/components/pwa-core-bridge-pack"), { ssr: false });

function PwaCoreBridgeDeferred() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(id);
  }, []);

  if (!ready) return null;
  return <PwaCoreBridgePack />;
}

/**
 * PWA bridge core — montati dopo init auth (non blocking login paint).
 */
export function DeferredPwaBridges() {
  const { status } = useAuth();
  const authInitDone = status !== "loading";

  if (!authInitDone) return null;

  return <PwaCoreBridgeDeferred />;
}
