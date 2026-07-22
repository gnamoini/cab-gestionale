"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { buildMezziTagliandiPresetsHref } from "@/lib/navigation/mezzi-tagliandi-links";

/** @deprecated I piani tagliando sono in Mezzi → Tagliandi. Redirect automatico. */
export function SettingsMaintenancePlansSection() {
  const router = useRouter();
  useEffect(() => {
    router.replace(buildMezziTagliandiPresetsHref());
  }, [router]);
  return (
    <p className="text-sm text-[color:var(--cab-text-muted)]">
      Reindirizzamento a Mezzi → Tagliandi → Preset…
    </p>
  );
}
