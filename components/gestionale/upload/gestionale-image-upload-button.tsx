"use client";

import { useCallback, useId, useRef, useState, type ReactNode } from "react";
import { HubIconCamera, HubIconPhoto } from "@/components/design-system/hub-table-action-icons";
import { GestionaleModalShell } from "@/components/gestionale/gestionale-modal";
import { GestionaleMobileBottomSheet } from "@/components/gestionale/gestionale-mobile-bottom-sheet";
import type { UploadFeedbackPhase } from "@/lib/upload/upload-feedback-types";
import { cabModalLayerClass, cabModalZStacked } from "@/lib/ui/mobile-modal-behavior";
import { dsBtnNeutral, dsDisabled, dsFocus } from "@/lib/ui/design-system";
import { useMaxMdDown } from "@/lib/ui/use-max-md-down";
import { useGestionaleOverlayBehavior } from "@/lib/ui/use-gestionale-overlay-behavior";

type GestionaleImageUploadButtonProps = {
  disabled?: boolean;
  buttonClassName?: string;
  buttonLabel?: ReactNode;
  title?: string;
  phase?: UploadFeedbackPhase;
  wrapperClassName?: string;
  busyIconOnly?: boolean;
  onImagePicked: (file: File) => void;
};

const PICKER_TITLE_ID = "gestionale-image-source-title";

const optionChevron = (
  <svg className="h-4 w-4 shrink-0 text-[color:var(--cab-text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
  </svg>
);

function ImageSourceOption({
  icon,
  title,
  emphasis = false,
  onClick,
}: {
  icon: ReactNode;
  title: string;
  emphasis?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`flex w-full min-w-0 items-center gap-3 rounded-[var(--ds-radius-lg)] border px-3 py-3 text-left transition-all duration-150 active:scale-[0.99] ${dsFocus} touch-manipulation ${
        emphasis
          ? "border-[color:color-mix(in_srgb,var(--cab-primary)_42%,var(--cab-border))] bg-[color:color-mix(in_srgb,var(--cab-primary)_8%,var(--cab-surface))] hover:bg-[color:color-mix(in_srgb,var(--cab-primary)_12%,var(--cab-surface))]"
          : "border-[color:var(--cab-border)] bg-[var(--cab-surface)] hover:bg-[var(--cab-hover)]"
      }`}
      onClick={onClick}
    >
      <span
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--ds-radius-lg)] border ${
          emphasis
            ? "border-[color:color-mix(in_srgb,var(--cab-primary)_35%,var(--cab-border))] bg-[color:color-mix(in_srgb,var(--cab-primary)_18%,var(--cab-surface))] text-[color:var(--cab-primary)]"
            : "border-[color:var(--cab-border)] bg-[color:color-mix(in_srgb,var(--cab-surface-2)_70%,var(--cab-card))] text-[color:var(--cab-text)]"
        }`}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1 text-sm font-semibold text-[color:var(--cab-text)]">{title}</span>
      {optionChevron}
    </button>
  );
}

function ImageSourcePickerBody({
  isMobile,
  onCamera,
  onGallery,
}: {
  isMobile: boolean;
  onCamera: () => void;
  onGallery: () => void;
}) {
  const cameraOption = (
    <ImageSourceOption
      key="camera"
      icon={<HubIconCamera className="h-5 w-5" />}
      title="Scatta foto"
      emphasis={isMobile}
      onClick={onCamera}
    />
  );
  const galleryOption = (
    <ImageSourceOption
      key="gallery"
      icon={<HubIconPhoto className="h-5 w-5" />}
      title="Scegli dalla galleria"
      emphasis={!isMobile}
      onClick={onGallery}
    />
  );

  return (
    <div className="flex flex-col gap-2 px-1 pb-1">
      {isMobile ? (
        <>
          {cameraOption}
          {galleryOption}
        </>
      ) : (
        <>
          {galleryOption}
          {cameraOption}
        </>
      )}
    </div>
  );
}

function GestionaleImageSourcePicker({
  open,
  onClose,
  onCamera,
  onGallery,
  layerClassName,
}: {
  open: boolean;
  onClose: () => void;
  onCamera: () => void;
  onGallery: () => void;
  layerClassName?: string;
}) {
  const isMobile = useMaxMdDown();
  const panelRef = useGestionaleOverlayBehavior({
    open,
    onRequestClose: onClose,
    source: "GestionaleImageSourcePicker",
  });

  if (!open) return null;

  const body = (
    <ImageSourcePickerBody isMobile={isMobile} onCamera={onCamera} onGallery={onGallery} />
  );

  if (isMobile) {
    return (
      <GestionaleMobileBottomSheet
        open={open}
        onRequestClose={onClose}
        title="Aggiungi foto"
        titleId={PICKER_TITLE_ID}
        panelRef={panelRef}
        layerClassName={layerClassName ?? cabModalLayerClass("stacked")}
      >
        <div className="px-3 py-3 pb-4">{body}</div>
      </GestionaleMobileBottomSheet>
    );
  }

  return (
    <GestionaleModalShell
      modalSize="formSmall"
      title="Aggiungi foto"
      titleId={PICKER_TITLE_ID}
      onRequestClose={onClose}
      layerClassName={layerClassName}
    >
      {body}
    </GestionaleModalShell>
  );
}

export function GestionaleImageUploadButton({
  disabled = false,
  buttonClassName,
  buttonLabel,
  title = "Aggiungi foto",
  phase = "idle",
  wrapperClassName = "flex min-w-0 flex-col gap-2",
  busyIconOnly = false,
  onImagePicked,
}: GestionaleImageUploadButtonProps) {
  const galleryInputId = useId();
  const cameraInputId = useId();
  const galleryRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const busy = phase === "uploading";
  const inputDisabled = disabled || busy;

  const pickFile = useCallback(
    (file: File | null | undefined) => {
      if (!file || !file.type.startsWith("image/")) return;
      onImagePicked(file);
    },
    [onImagePicked],
  );

  const openGallery = useCallback(() => {
    setPickerOpen(false);
    galleryRef.current?.click();
  }, []);

  const openCamera = useCallback(() => {
    setPickerOpen(false);
    cameraRef.current?.click();
  }, []);

  return (
    <>
      <div className={wrapperClassName}>
        <button
          type="button"
          title={title}
          disabled={inputDisabled}
          className={`${buttonClassName ?? dsBtnNeutral} ${inputDisabled ? `cursor-wait opacity-60 ${dsDisabled}` : "cursor-pointer"}`}
          onClick={() => {
            if (!inputDisabled) setPickerOpen(true);
          }}
        >
          {busy ? (
            busyIconOnly ? (
              <>
                <span
                  className="h-4 w-4 animate-spin rounded-full border-2 border-[color:color-mix(in_srgb,var(--cab-border)_90%,transparent)] border-t-[var(--cab-primary)]"
                  aria-hidden
                />
                <span className="sr-only">Caricamento…</span>
              </>
            ) : (
              <span className="inline-flex items-center gap-1.5">
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[color:color-mix(in_srgb,var(--cab-border)_90%,transparent)] border-t-[var(--cab-primary)]" aria-hidden />
                Caricamento…
              </span>
            )
          ) : (
            buttonLabel ?? (
              <>
                <HubIconPhoto />
                Aggiungi foto
              </>
            )
          )}
        </button>
        <input
          ref={galleryRef}
          id={galleryInputId}
          type="file"
          accept="image/*"
          className="sr-only"
          disabled={inputDisabled}
          onChange={(e) => {
            pickFile(e.currentTarget.files?.[0]);
            e.currentTarget.value = "";
          }}
        />
        <input
          ref={cameraRef}
          id={cameraInputId}
          type="file"
          accept="image/*"
          capture="environment"
          className="sr-only"
          disabled={inputDisabled}
          onChange={(e) => {
            pickFile(e.currentTarget.files?.[0]);
            e.currentTarget.value = "";
          }}
        />
      </div>

      <GestionaleImageSourcePicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onCamera={openCamera}
        onGallery={openGallery}
        layerClassName={cabModalZStacked}
      />
    </>
  );
}
