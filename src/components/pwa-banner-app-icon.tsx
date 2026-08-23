"use client";

import Image from "next/image";
import { PWA_BANNER_APP_ICON_SIZE_PX, PWA_BANNER_APP_ICON_SRC } from "@/lib/pwa/pwa-icons";

const pwaBannerAppIconClass =
  "rounded-[var(--ds-radius-lg)] ring-1 ring-[color:color-mix(in_srgb,#ffffff_12%,transparent)]";

export function PwaBannerAppIcon() {
  return (
    <Image
      src={PWA_BANNER_APP_ICON_SRC}
      alt=""
      width={PWA_BANNER_APP_ICON_SIZE_PX}
      height={PWA_BANNER_APP_ICON_SIZE_PX}
      quality={90}
      sizes={`${PWA_BANNER_APP_ICON_SIZE_PX}px`}
      className={pwaBannerAppIconClass}
    />
  );
}
