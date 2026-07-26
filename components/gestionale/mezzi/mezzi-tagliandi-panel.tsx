"use client";

import { MezziTagliandiSectionToggle } from "@/components/gestionale/mezzi/mezzi-tagliandi-section-toggle";
import { MezziTagliandiOverview } from "@/components/gestionale/mezzi/mezzi-tagliandi-overview";
import { MezziTagliandiPresetsSection } from "@/components/gestionale/mezzi/mezzi-tagliandi-presets-section";
import type { TagliandiSectionParam } from "@/lib/navigation/mezzi-tagliandi-links";
import type { TagliandoStatoUi } from "@/lib/maintenance-plans/tagliando-stato-labels";

export function MezziTagliandiPanel({
  canEdit,
  tagliandiSection,
  onTagliandiSectionChange,
  presetFilter = "",
  statoFilter = "",
  highlightConfigId = null,
  onOpenMezzoHub,
}: {
  canEdit: boolean;
  tagliandiSection: TagliandiSectionParam;
  onTagliandiSectionChange: (section: TagliandiSectionParam) => void;
  presetFilter?: string;
  statoFilter?: TagliandoStatoUi | "";
  highlightConfigId?: string | null;
  onOpenMezzoHub?: (mezzoId: string) => void;
}) {
  return (
    <div className="space-y-4">
      <MezziTagliandiSectionToggle value={tagliandiSection} onChange={onTagliandiSectionChange} />
      {tagliandiSection === "preset" ? (
        <MezziTagliandiPresetsSection canEdit={canEdit} />
      ) : (
        <MezziTagliandiOverview
          canEdit={canEdit}
          presetFilter={presetFilter}
          statoFilter={statoFilter}
          highlightConfigId={highlightConfigId}
          onOpenMezzoHub={onOpenMezzoHub}
        />
      )}
    </div>
  );
}

export { MezziTagliandiOverview };
