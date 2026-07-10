"use client";

import { Tooltip } from "@/components/ui";
import { LIST_DIVIDER_UL } from "@/lib/ui/list-primitives";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Button } from "@/components/design-system/button";
import {
  effectivePrimaryColor,
  type CabBrandingSettings,
} from "@/lib/branding/branding-settings-model";
import type { BrandingLogoUploadDraft } from "@/lib/branding/branding-logo-upload";
import { CAB_BRANDING_PALETTES } from "@/lib/theme/cab-branding-palettes";
import { getBrandingContrastWarnings } from "@/lib/theme/cab-branding-derive";
import { normalizeHex } from "@/lib/lavorazioni/color-utils";
import { CAB_DEFAULT_PRIMARY } from "@/lib/theme/cab-branding-defaults";
import { CAB_LOGO_ASPECT, CAB_LOGO_PATH } from "@/components/gestionale/cab-logo";
import {
  dsAccentSoftBanner,
  dsBtnPrimary,
  dsFocus,
  dsTableActionBtnColorSwatch,
  dsTableActionBtnColorSwatchOpen,
  dsTypoSmall,
} from "@/lib/ui/design-system";
import {
  SETTINGS_SECTION_HINT,
  SETTINGS_SECTION_TITLE,
  SETTINGS_WARNING_BANNER,
  SettingsListFrame,
  SettingsListSection,
  type SettingsSectionLayout,
} from "@/components/dashboard/settings-list-ui";
import { SettingsColorPickerPopover } from "@/components/gestionale/settings-color-picker-popover";
import { extractPrimaryColorFromImageUrl } from "@/lib/branding/extract-logo-primary-color";
import { validateBrandingLogoFile, validateBrandingLogoDimensions } from "@/lib/branding/branding-logo-validation";

const BRANDING_PALETTE_SWATCH_CLASS =
  "block h-8 w-full max-w-[2.75rem] rounded-md border border-[color:color-mix(in_srgb,var(--cab-border)_85%,transparent)] shadow-[inset_0_0_0_1px_color-mix(in_srgb,#000_8%,transparent)]";

const BRANDING_SUBSECTION_CLASS = "px-3 py-3 sm:px-4 sm:py-4";

const BRANDING_LOGO_DROPZONE_CLASS =
  "mt-3 flex min-h-[7.5rem] flex-col items-center justify-center gap-3 rounded-[var(--ds-radius-lg)] border border-dashed border-[color:var(--cab-border)] bg-[color:color-mix(in_srgb,var(--cab-surface-2)_40%,var(--cab-card))] px-4 py-5";

function BrandingPrimaryColorSwatch({
  value,
  onChange,
}: {
  value: string;
  onChange: (hex: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLButtonElement>(null);
  const hex = normalizeHex(value) ?? CAB_DEFAULT_PRIMARY;

  return (
    <>
      <Tooltip content={"Selettore colore principale"}><button ref={anchorRef} type="button" aria-label="Selettore colore principale" aria-expanded={open} className={`${dsTableActionBtnColorSwatch}${open ? ` ${dsTableActionBtnColorSwatchOpen}` : ""}`} style={{ backgroundColor: hex }} onClick={() => setOpen((o) => !o)}/></Tooltip>
      <SettingsColorPickerPopover
        open={open}
        anchorRef={anchorRef}
        value={hex}
        ariaLabel="Selettore colore principale"
        onChange={onChange}
        onClose={() => setOpen(false)}
      />
    </>
  );
}

function BrandingPreviewPanel({
  branding,
  previewPrimary,
}: {
  branding: CabBrandingSettings;
  previewPrimary: string;
}) {
  return (
    <div
      className="mt-3 rounded-[var(--ds-radius-lg)] border border-[color:var(--cab-border)] bg-[color:color-mix(in_srgb,var(--cab-surface-2)_35%,var(--cab-card))] p-4"
      style={
        branding.primaryColor
          ? ({
              ["--cab-primary" as string]: previewPrimary,
            } as CSSProperties)
          : undefined
      }
    >
      <Button variant="primary" type="button" className="pointer-events-none">
        Pulsante primario
      </Button>
      <p className="mt-3">
        <span className="text-sm font-medium text-[color:var(--cab-primary)] hover:underline">Link evidenziato</span>
      </p>
      <div className={`${dsAccentSoftBanner} mt-3 px-3 py-2 text-sm`}>Banner soft con accento primario</div>
      <div className="mt-3 inline-flex rounded-lg border border-[color:var(--cab-border)] p-0.5">
        <span className="rounded-md bg-[color:color-mix(in_srgb,var(--cab-primary)_14%,var(--cab-surface))] px-3 py-1.5 text-xs font-semibold text-[color:var(--cab-primary)]">
          Tab attiva
        </span>
        <span className={`${dsTypoSmall} px-3 py-1.5 text-[color:var(--cab-text-muted)]`}>Tab</span>
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-[color:var(--cab-surface-2)]">
        <div className="h-full w-2/3 rounded-full bg-[color:var(--cab-primary)]" />
      </div>
    </div>
  );
}

export type SettingsBrandingSectionProps = {
  branding: CabBrandingSettings;
  onBrandingChange: (next: CabBrandingSettings) => void;
  logoDraft: BrandingLogoUploadDraft;
  onLogoDraftChange: (next: BrandingLogoUploadDraft) => void;
  logoPreviewUrl: string | null;
  onLogoPreviewUrlChange: (url: string | null) => void;
  onResetBranding: () => void;
  layout?: SettingsSectionLayout;
};

export function SettingsBrandingSection({
  branding,
  onBrandingChange,
  logoDraft,
  onLogoDraftChange,
  logoPreviewUrl,
  onLogoPreviewUrlChange,
  onResetBranding,
  layout = "flat",
}: SettingsBrandingSectionProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [aspectWarning, setAspectWarning] = useState<string | null>(null);
  const [extractingLogoColor, setExtractingLogoColor] = useState(false);
  const [logoColorExtractError, setLogoColorExtractError] = useState<string | null>(null);

  const previewPrimary = effectivePrimaryColor(branding);
  const contrastWarnings = useMemo(
    () => getBrandingContrastWarnings(branding.primaryColor),
    [branding.primaryColor],
  );

  const displayLogoSrc =
    logoPreviewUrl ??
    (branding.logoStoragePath
      ? `/api/branding/logo?v=${encodeURIComponent(branding.updatedAt ?? "1")}`
      : CAB_LOGO_PATH);

  useEffect(() => {
    return () => {
      if (logoPreviewUrl?.startsWith("blob:")) URL.revokeObjectURL(logoPreviewUrl);
    };
  }, [logoPreviewUrl]);

  const handlePrimaryChange = useCallback(
    (hex: string) => {
      const normalized = normalizeHex(hex);
      onBrandingChange({
        ...branding,
        primaryColor: normalized === CAB_DEFAULT_PRIMARY ? null : normalized,
      });
    },
    [branding, onBrandingChange],
  );

  const handleFile = useCallback(
    async (file: File | null) => {
      setUploadError(null);
      setAspectWarning(null);
      if (!file) return;
      const basic = validateBrandingLogoFile(file);
      if (!basic.ok) {
        setUploadError(basic.error);
        return;
      }
      const dims = await validateBrandingLogoDimensions(file);
      if (!dims.ok) {
        setUploadError(dims.error);
        return;
      }
      if (dims.aspectWarning) setAspectWarning(dims.aspectWarning);
      if (logoPreviewUrl?.startsWith("blob:")) URL.revokeObjectURL(logoPreviewUrl);
      onLogoPreviewUrlChange(URL.createObjectURL(file));
      onLogoDraftChange({ pendingFile: file, removeCustomLogo: false });
    },
    [logoPreviewUrl, onLogoDraftChange, onLogoPreviewUrlChange],
  );

  const handleRemoveLogo = useCallback(() => {
    if (logoPreviewUrl?.startsWith("blob:")) URL.revokeObjectURL(logoPreviewUrl);
    onLogoPreviewUrlChange(null);
    onLogoDraftChange({ pendingFile: null, removeCustomLogo: true });
    setUploadError(null);
    setAspectWarning(null);
  }, [logoPreviewUrl, onLogoDraftChange, onLogoPreviewUrlChange]);

  const handleExtractColorFromLogo = useCallback(async () => {
    setLogoColorExtractError(null);
    setExtractingLogoColor(true);
    try {
      const hex = await extractPrimaryColorFromImageUrl(displayLogoSrc);
      if (!hex) {
        setLogoColorExtractError(
          "Impossibile rilevare un colore dal logo. Prova un PNG/JPEG con sfondo trasparente o colori saturi.",
        );
        return;
      }
      handlePrimaryChange(hex);
    } finally {
      setExtractingLogoColor(false);
    }
  }, [displayLogoSrc, handlePrimaryChange]);

  const controls = (
    <SettingsListSection
      layout={layout}
      title={layout === "card" ? "Personalizzazione" : undefined}
      description={
        layout === "card"
          ? "Colore principale, logo e ripristino del branding CAB."
          : undefined
      }
    >
      <SettingsListFrame>
        <div className={`${LIST_DIVIDER_UL}`}>
          <section className={BRANDING_SUBSECTION_CLASS}>
            <h3 className={SETTINGS_SECTION_TITLE}>Colore principale</h3>
            <p className={SETTINGS_SECTION_HINT}>
              Modifica il colore primario dell&apos;interfaccia. I colori derivati (hover, focus, sfumature) si adattano
              automaticamente.
            </p>

            <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
              {CAB_BRANDING_PALETTES.map((palette) => {
                const active =
                  (branding.primaryColor ?? CAB_DEFAULT_PRIMARY).toLowerCase() === palette.hex.toLowerCase();
                return (
                  <button
                    key={palette.id}
                    type="button"
                    aria-label={`Palette ${palette.label}`}
                    aria-pressed={active}
                    className={`flex min-h-11 flex-col items-center justify-center gap-1.5 rounded-lg border px-2 py-2.5 text-center transition-[background-color,border-color,box-shadow] duration-150 ${
                      active
                        ? "border-[color:var(--cab-primary)] bg-[color:color-mix(in_srgb,var(--cab-primary)_10%,var(--cab-surface))] shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--cab-primary)_25%,transparent)]"
                        : "border-[color:var(--cab-border)] bg-[color:var(--cab-surface)] hover:bg-[color:var(--cab-hover)]"
                    } ${dsFocus}`}
                    onClick={() => handlePrimaryChange(palette.hex)}
                  >
                    <span
                      className={BRANDING_PALETTE_SWATCH_CLASS}
                      style={{ backgroundColor: palette.hex }}
                      aria-hidden
                    />
                    <span className="text-[11px] font-medium leading-tight text-[color:var(--cab-text)]">
                      {palette.label}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-[color:var(--cab-border)] pt-4">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-[color:var(--cab-text-muted)]">
                Personalizza
              </span>
              <BrandingPrimaryColorSwatch value={previewPrimary} onChange={handlePrimaryChange} />
              <span className="font-mono text-xs tabular-nums text-[color:var(--cab-text-muted)]">
                {previewPrimary.toUpperCase()}
              </span>
              <button
                type="button"
                className={`min-h-11 rounded-lg border border-[color:var(--cab-border)] px-3 py-2 text-xs font-medium text-[color:var(--cab-text)] hover:bg-[color:var(--cab-hover)] disabled:cursor-not-allowed disabled:opacity-50 ${dsFocus}`}
                disabled={extractingLogoColor}
                aria-label="Usa colore dominante dal logo caricato"
                onClick={() => void handleExtractColorFromLogo()}
              >
                {extractingLogoColor ? "Analisi logo…" : "Colore dal logo"}
              </button>
            </div>

            {logoColorExtractError ? (
              <p className="mt-2 text-xs text-[color:var(--cab-danger)]">{logoColorExtractError}</p>
            ) : null}

            {contrastWarnings.map((w) => (
              <p key={w.kind} className={SETTINGS_WARNING_BANNER} role="status">
                {w.message}
              </p>
            ))}
          </section>

          <section className={BRANDING_SUBSECTION_CLASS}>
            <h3 className={SETTINGS_SECTION_TITLE}>Logo applicazione</h3>
            <p className={SETTINGS_SECTION_HINT}>
              Carica un&apos;immagine PNG, JPEG, WebP o SVG (max 512 KB). Il rapporto viene preservato come nel logo
              attuale.
            </p>

            <div
              className={BRANDING_LOGO_DROPZONE_CLASS}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const file = e.dataTransfer.files?.[0] ?? null;
                void handleFile(file);
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={displayLogoSrc}
                alt="Anteprima logo"
                className="max-h-16 w-auto max-w-full object-contain"
                style={{ aspectRatio: String(CAB_LOGO_ASPECT) }}
              />
              <div className="flex flex-wrap items-center justify-center gap-2">
                <button
                  type="button"
                  className={`${dsBtnPrimary} min-h-11 px-4 py-2 text-sm`}
                  onClick={() => fileInputRef.current?.click()}
                >
                  Carica logo
                </button>
                {(branding.logoStoragePath || logoDraft.pendingFile) && !logoDraft.removeCustomLogo ? (
                  <button
                    type="button"
                    className={`min-h-11 rounded-lg border border-[color:var(--cab-border)] px-4 py-2 text-sm font-medium text-[color:var(--cab-text)] hover:bg-[color:var(--cab-hover)] ${dsFocus}`}
                    onClick={handleRemoveLogo}
                  >
                    Rimuovi logo personalizzato
                  </button>
                ) : null}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                className="sr-only"
                aria-label="Upload logo"
                onChange={(e) => void handleFile(e.target.files?.[0] ?? null)}
              />
            </div>

            {uploadError ? (
              <p className="mt-2 text-xs text-[color:var(--cab-danger)]">{uploadError}</p>
            ) : null}
            {aspectWarning ? (
              <p className="mt-2 text-xs text-[color:var(--cab-warning)]">{aspectWarning}</p>
            ) : null}
          </section>

          <section className={BRANDING_SUBSECTION_CLASS}>
            <h3 className={SETTINGS_SECTION_TITLE}>Ripristino</h3>
            <p className={SETTINGS_SECTION_HINT}>Ripristina colore e logo originali CAB.</p>
            <button
              type="button"
              className={`mt-3 min-h-11 rounded-lg border border-[color:var(--cab-border)] px-4 py-2 text-sm font-medium text-[color:var(--cab-danger)] hover:bg-[color:var(--cab-hover)] ${dsFocus}`}
              onClick={onResetBranding}
            >
              Ripristina branding originale
            </button>
          </section>
        </div>
      </SettingsListFrame>
    </SettingsListSection>
  );

  const preview = (
    <SettingsListSection layout={layout}>
      <SettingsListFrame>
        <section className={BRANDING_SUBSECTION_CLASS}>
          <h3 className={SETTINGS_SECTION_TITLE}>Anteprima</h3>
          <p className={SETTINGS_SECTION_HINT}>Campione degli elementi che usano il colore principale.</p>
          <BrandingPreviewPanel branding={branding} previewPrimary={previewPrimary} />
        </section>
      </SettingsListFrame>
    </SettingsListSection>
  );

  return (
    <div className="flex w-full flex-col gap-4 xl:flex-row xl:items-start xl:gap-6">
      <div className="min-w-0 flex-1">{controls}</div>
      <div className="w-full shrink-0 xl:max-w-sm">{preview}</div>
    </div>
  );
}
