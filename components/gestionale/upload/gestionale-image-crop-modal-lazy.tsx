"use client";

import dynamic from "next/dynamic";

export const GestionaleImageCropModalLazy = dynamic(
  () =>
    import("@/components/gestionale/upload/gestionale-image-crop-modal").then((m) => ({
      default: m.GestionaleImageCropModal,
    })),
  { ssr: false },
);
