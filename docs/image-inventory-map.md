# Image inventory map

Audit baseline for the gestionale media layer (post Server Components migration).

## Classification by usage type

| Type | Components | Routes |
|------|------------|--------|
| **CRITICAL (LCP)** | `CabLogo` — `app-shell.tsx`, `auth-standalone-page.tsx`, `dashboard-welcome.tsx` | Global shell, auth, dashboard welcome |
| **LIST (thumb)** | `RecordImageManager` thumbs, `PhotoThumb`, `ClientLavorazionePhotoStrip` | Modals (lav/mezzi/mag), client portal table |
| **DETAIL** | `RecordImageManager` preview, `PhotoLightbox` | Modals |
| **DECORATIVE** | Auth watermark `CabLogo` (`priority={false}`) | Auth pages |
| **FUNCTIONAL (out of scope)** | `ClientLavorazioneQrDialog` (data URL QR) | Client portal |
| **SETTINGS** | `SettingsBrandingSection` preview `<img>` | Impostazioni branding |
| **N/A** | Report charts (SVG), staff list/kanban tables | `/report`, `/lavorazioni` list |

## Component → source → delivery

| Component | File | Source | Delivery (target) |
|-----------|------|--------|-------------------|
| `CabLogo` | `components/gestionale/cab-logo.tsx` | `/cab-logo.png` or `/api/branding/logo` | `next/image` + API AVIF/WebP for custom |
| `RecordImageManager` | `components/gestionale/media/record-image-manager.tsx` | Supabase `images` bucket | `GestionaleMediaImage` thumb + proxy detail |
| `ClientLavorazionePhotoStrip` | `components/lavorazioni-clienti/client-lavorazione-photos.tsx` | Same bucket via `listStoredImages` | `GestionaleMediaImage` + lazy IO |
| `GestionaleImageCropModal` | `components/gestionale/upload/gestionale-image-crop-modal.tsx` | Local blob | Upload only (not delivery) |
| `SettingsBrandingSection` | `components/dashboard/settings-branding-section.tsx` | Blob preview / API | Settings UI only |

## Record image consumers

| Scope | Consumer |
|-------|----------|
| `lavorazioni` | `lavorazione-media-panel.tsx`, schede modal |
| `mezzi` | `mezzi-hub-detail-modal.tsx` |
| `magazzino` | `ricambio-info-panel.tsx`, `ricambio-edit-modal.tsx`, `ricambio-new-modal.tsx` |

## Static assets (`public/`)

| File | Size audit | Action |
|------|------------|--------|
| `cab-logo.png` | ~7.4 KB (< 150 KB) | Keep PNG; `next/image` optimization only |
| `window.svg`, `file.svg`, `vercel.svg` | Scaffold | Unused in app UI |

## Upload pipeline (target)

- Thumb: `{ts}-{name}.thumb.webp` (256px max side)
- Full: `{ts}-{name}.full.avif` + `{ts}-{name}.full.webp`
- Legacy: existing `.jpg` served via `/api/media/image` proxy until re-upload

## Hard rule exclusions

- Assets < 150 KB already optimized: default `cab-logo.png`
- QR data URLs, PDF embedded logos, report SVG charts
