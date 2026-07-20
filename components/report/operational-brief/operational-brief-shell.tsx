"use client";

import { useState } from "react";
import { Button } from "@/components/design-system/button";
import { OperationalBriefAnalystView } from "@/components/report/operational-brief/operational-brief-analyst-view";
import { OperationalBriefDirectorView } from "@/components/report/operational-brief/operational-brief-director-view";
import type { OperationalBriefOutput } from "@/lib/operational-intelligence/types";

export function OperationalBriefShell({ brief }: { brief: OperationalBriefOutput }) {
  const [view, setView] = useState<"director" | "analyst">("director");

  return (
    <div className="min-w-0 space-y-4">
      <div className="flex justify-end">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setView((v) => (v === "director" ? "analyst" : "director"))}
        >
          {view === "director" ? "Vista analista →" : "← Vista direttore"}
        </Button>
      </div>
      {view === "director" ? (
        <OperationalBriefDirectorView brief={brief} />
      ) : (
        <OperationalBriefAnalystView brief={brief} />
      )}
    </div>
  );
}
