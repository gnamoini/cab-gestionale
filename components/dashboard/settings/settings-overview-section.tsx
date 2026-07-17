"use client";

import Link from "next/link";
import { Tooltip } from "@/components/ui";
import { useMemo } from "react";
import {
  SETTINGS_OVERVIEW_TILE,
  SETTINGS_OVERVIEW_TILE_ICON,
  SETTINGS_OVERVIEW_TILE_LABEL,
  SETTINGS_SECTION_BODY,
  SETTINGS_SECTION_TITLE,
} from "@/components/dashboard/settings-list-ui";
import { SettingsSectionIcon } from "@/components/dashboard/settings/settings-section-icons";
import { settingsNavGroupedItems, type SistemaSectionId } from "@/components/dashboard/settings/settings-workspace-types";
import { dsFocus } from "@/lib/ui/design-system";

export function SettingsOverviewSection({
  onPickSection,
}: {
  onPickSection: (id: SistemaSectionId) => void;
}) {
  const groups = useMemo(() => settingsNavGroupedItems(), []);

  return (
    <div className={`${SETTINGS_SECTION_BODY} space-y-6`}>
      {groups.map((group) => (
        <section key={group.label} aria-labelledby={`settings-overview-${group.label}`}>
          <h3 id={`settings-overview-${group.label}`} className={SETTINGS_SECTION_TITLE}>
            {group.label}
          </h3>
          <ul className="mt-2.5 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
            {group.items.map((item) => (
              <li key={item.id}>
                <Tooltip content={item.label}><button type="button" onClick={() => onPickSection(item.id)} className={`${SETTINGS_OVERVIEW_TILE} ${dsFocus}`}>
                  <span className={SETTINGS_OVERVIEW_TILE_ICON} aria-hidden>
                    <SettingsSectionIcon sectionId={item.id} className="h-4 w-4"/>
                  </span>
                  <span className={SETTINGS_OVERVIEW_TILE_LABEL}>{item.label}</span>
                </button></Tooltip>
              </li>
            ))}
            {group.label === "Sistema" ? (
              <li>
                <Tooltip content="AI Providers">
                  <Link href="/impostazioni/ai-providers" className={`${SETTINGS_OVERVIEW_TILE} ${dsFocus}`}>
                    <span className={SETTINGS_OVERVIEW_TILE_ICON} aria-hidden>
                      <SettingsSectionIcon sectionId="sys-tkb-kb" className="h-4 w-4" />
                    </span>
                    <span className={SETTINGS_OVERVIEW_TILE_LABEL}>AI Providers</span>
                  </Link>
                </Tooltip>
              </li>
            ) : null}
          </ul>
        </section>
      ))}
    </div>
  );
}
