"use client";

import { GlobalAnchoredMenuItems, Tooltip } from "@/components/ui";
import { useCallback, useId, useRef, useState } from "react";
import { dsPageToolbarBtn } from "@/lib/ui/design-system";
import { useDropdownFocusRestore } from "@/lib/ui/use-dropdown-focus-restore";
import { openUrlInNewTab } from "@/lib/pdf/open-url-new-tab";

const BLANK_TYPES = [
  { tipo: "scheda-ingresso-blank", label: "Scheda ingresso" },
  { tipo: "scheda-lavorazioni-blank", label: "Scheda lavorazioni" },
  { tipo: "scheda-ricambi-blank", label: "Scheda ricambi" },
] as const;

export function IconSchedaBlank({ className = "h-4 w-4 shrink-0" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M7 4h7l3 3v13H7V4Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M14 4v4h4M9.5 12h5M9.5 15.5h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function SchedaBlankPdfMenu() {
  const menuId = useId();
  const shellRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = useCallback(() => setMenuOpen(false), []);
  useDropdownFocusRestore(menuOpen);

  return (
    <div ref={shellRef} className="relative w-full shrink-0 sm:w-auto">
      <Tooltip content="Scarica una scheda vuota da stampare">
        <button
          type="button"
          className={dsPageToolbarBtn}
          aria-expanded={menuOpen}
          aria-haspopup="menu"
          aria-controls={menuId}
          aria-label="Schede da stampare"
          onClick={() => setMenuOpen((open) => !open)}
        >
          <IconSchedaBlank />
          Schede
        </button>
      </Tooltip>
      <GlobalAnchoredMenuItems
        open={menuOpen}
        anchorRef={shellRef}
        onClose={closeMenu}
        listId={menuId}
        aria-label="Schede da stampare"
        placement="bottom-end"
        matchAnchorWidth={false}
        items={BLANK_TYPES.map((item) => ({
          id: item.tipo,
          label: item.label,
        }))}
        onSelect={(item) => {
          closeMenu();
          const blank = BLANK_TYPES.find((b) => b.tipo === item.id);
          openUrlInNewTab(`/api/pdf/artifacts/scheda-blank/${item.id}`, {
            context: "scheda",
            label: blank?.label,
          });
        }}
      />
    </div>
  );
}
