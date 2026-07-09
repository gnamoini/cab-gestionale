"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import {
  fatturazioneSectionsForPhase,
  type FatturazioneSectionId,
} from "@/lib/fatturazione/fatturazione-sections-config";
import { dsSegmentedBtnOff, dsSegmentedBtnOn, dsSegmentedWrap } from "@/lib/ui/design-system";

export function FatturazioneHubNav({ activeTab }: { activeTab: FatturazioneSectionId }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sections = fatturazioneSectionsForPhase();

  const setTab = useCallback(
    (tab: FatturazioneSectionId) => {
      const params = new URLSearchParams(searchParams.toString());
      if (tab === "fatture") params.delete("tab");
      else params.set("tab", tab);
      const qs = params.toString();
      router.replace(qs ? `/fatturazione?${qs}` : "/fatturazione", { scroll: false });
    },
    [router, searchParams],
  );

  return (
    <nav aria-label="Sezioni fatturazione" className={dsSegmentedWrap}>
      {sections.map((s) => (
        <button
          key={s.id}
          type="button"
          className={activeTab === s.id ? dsSegmentedBtnOn : dsSegmentedBtnOff}
          aria-current={activeTab === s.id ? "page" : undefined}
          onClick={() => setTab(s.id)}
        >
          {s.label}
        </button>
      ))}
    </nav>
  );
}
