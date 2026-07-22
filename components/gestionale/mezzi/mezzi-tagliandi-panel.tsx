"use client";

import { MezziTagliandiSectionToggle } from "@/components/gestionale/mezzi/mezzi-tagliandi-section-toggle";
import { MezziTagliandiMatrixTable } from "@/components/gestionale/mezzi/mezzi-tagliandi-matrix-table";
import { MezziTagliandiOverview } from "@/components/gestionale/mezzi/mezzi-tagliandi-overview";
import { MezziTagliandiPresetsSection } from "@/components/gestionale/mezzi/mezzi-tagliandi-presets-section";
import type { TagliandiSectionParam } from "@/lib/navigation/mezzi-tagliandi-links";
import type { TagliandoStatoUi } from "@/lib/maintenance-plans/tagliando-stato-labels";
import { useMaintenanceEngineV2Enabled } from "@/lib/officina/use-maintenance-engine-v2-enabled";

export function MezziTagliandiPanel({
  canEdit,
  tagliandiSection,
  onTagliandiSectionChange,
  presetFilter = "",
  statoFilter = "",
  highlightConfigId = null,
}: {
  canEdit: boolean;
  tagliandiSection: TagliandiSectionParam;
  onTagliandiSectionChange: (section: TagliandiSectionParam) => void;
  presetFilter?: string;
  statoFilter?: TagliandoStatoUi | "";
  highlightConfigId?: string | null;
}) {
  const v2Enabled = useMaintenanceEngineV2Enabled();

  if (!v2Enabled) {
    return <MezziTagliandiMatrixTable enabled canEdit={canEdit} />;
  }

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
        />
      )}
    </div>
  );
}

export { MezziTagliandiOverview };
