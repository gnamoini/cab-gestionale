"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Button } from "@/components/design-system/button";
import {
  DEFAULT_CAB_BRANDING_SETTINGS,
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
  dsTypoSmall,
} from "@/lib/ui/design-system";
import {
  SETTINGS_SECTION_CARD,
  SETTINGS_SECTION_HINT,
  SETTINGS_WARNING_BANNER,
  SettingsSectionHeader,
} from "@/components/dashboard/settings-list-ui";
import { validateBrandingLogoFile, validateBrandingLogoDimensions } from "@/lib/branding/branding-logo-validation";

export type SettingsBrandingSectionProps = {
  branding: CabBrandingSettings;
  onBrandingChange: (next: CabBrandingSettings) => void;
  logoDraft: BrandingLogoUploadDraft;
  onLogoDraftChange: (next: BrandingLogoUploadDraft) => void;
  logoPreviewUrl: string | null;
  onLogoPreviewUrlChange: (url: string | null) => void;
  onResetBranding: () => void;
};

export function SettingsBrandingSection({
  branding,
  onBrandingChange,
  logoDraft,
  onLogoDraftChange,
  logoPreviewUrl,
  onLogoPreviewUrlChange,
  onResetBranding,
}: SettingsBrandingSectionProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [aspectWarning, setAspectWarning] = useState<string | null>(null);

  const previewPrimary = effectivePrimaryColor(branding);
  const contrastWarnings = useMemo(
    () => getBrandingContrastWarnings(branding.primaryColor),
    [branding.primaryColor],
  );

  const displayLogoSrc = logoPreviewUrl ?? (branding.logoStoragePath ? `/api/branding/logo?v=${encodeURIComponent(branding.updatedAt ?? "1")}` : CAB_LOGO_PATH);

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

  return (
    <div className="flex w-full flex-col gap-4 lg:flex-row lg:items-start lg:gap-6">
      <div className="min-w-0 flex-1 space-y-4">
        <div className={SETTINGS_SECTION_CARD}>
          <SettingsSectionHeader
            level="card"
            title="Colore principale"
            description="Modifica il colore primario dell'interfaccia. I colori derivati (hover, focus, sfumature) si adattano automaticamente."
          />

          <div className="mt-4 flex flex-wrap gap-2">
            {CAB_BRANDING_PALETTES.map((palette) => {
              const active =
                (branding.primaryColor ?? CAB_DEFAULT_PRIMARY).toLowerCase() === palette.hex.toLowerCase();
              return (
                <button
                  key={palette.id}
                  type="button"
                  aria-label={`Palette ${palette.label}`}
                  aria-pressed={active}
                  className={`inline-flex min-h-11 items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${active ? "border-[color:var(--cab-primary)] bg-[color:color-mix(in_srgb,var(--cab-primary)_10%,var(--cab-surface))]" : "border-[color:var(--cab-border)] bg-[color:var(--cab-surface)] hover:bg-[color:var(--cab-hover)]"} ${dsFocus}`}
                  onClick={() => handlePrimaryChange(palette.hex)}
                >
                  <span
                    className="inline-block h-5 w-5 shrink-0 rounded-full border border-[color:var(--cab-border)]"
                    style={{ backgroundColor: palette.hex }}
                  />
                  {palette.label}
                </button>
              );
            })}
          </div>

          <label htmlFor="branding-color-picker" className="mt-4 block text-xs font-medium text-[color:var(--cab-text-muted)]">
            Selettore colore
            <input
              id="branding-color-picker"
              type="color"
              value={previewPrimary}
              aria-label="Selettore colore principale"
              className={`${dsFocus} mt-1.5 h-11 w-full max-w-[12rem] cursor-pointer overflow-hidden rounded-lg border border-[color:var(--cab-border)] bg-[color:var(--cab-surface-2)] p-1`}
              onChange={(e) => handlePrimaryChange(e.target.value)}
            />
          </label>

          {contrastWarnings.map((w) => (
            <p key={w.kind} className={SETTINGS_WARNING_BANNER} role="status">
              {w.message}
            </p>
          ))}
        </div>

        <div className={SETTINGS_SECTION_CARD}>
          <SettingsSectionHeader
            level="card"
            title="Logo applicazione"
            description="Carica un&apos;immagine PNG, JPEG, WebP o SVG (max 512 KB). Il rapporto viene preservato come nel logo attuale."
          />

          <div
            className="mt-4 flex min-h-[120px] flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-[color:var(--cab-border-strong)] bg-[color:var(--cab-surface-2)] px-4 py-6"
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
        </div>

        <div className={SETTINGS_SECTION_CARD}>
          <SettingsSectionHeader
            level="card"
            title="Ripristino"
            description="Ripristina colore e logo originali CAB."
          />
          <button
            type="button"
            className={`mt-3 min-h-11 rounded-lg border border-[color:var(--cab-border)] px-4 py-2 text-sm font-medium text-[color:var(--cab-danger)] hover:bg-[color:var(--cab-hover)] ${dsFocus}`}
            onClick={onResetBranding}
          >
            Ripristina branding originale
          </button>
        </div>
      </div>

      <div className={`${SETTINGS_SECTION_CARD} w-full shrink-0 lg:max-w-sm`}>
        <SettingsSectionHeader
          level="card"
          title="Anteprima"
          description="Campione degli elementi che usano il colore principale."
        />

        <div
          className="rounded-lg border border-[color:var(--cab-border)] p-4"
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
      </div>
    </div>
  );
}
