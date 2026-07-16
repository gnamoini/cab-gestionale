import type { PersistedThemeMode } from "@/lib/theme/user-theme-prefs";

/** SSOT scroll: app/globals.css `.gestionale-scrollbar` + token --cab-scrollbar-*. */
const CAPTURE_PDF_PREVIEW_FRAME_CSS = `
:root {
  --cab-scrollbar-size: 10px;
  --cab-scrollbar-thumb: rgb(161 161 170 / 0.55);
  --cab-scrollbar-thumb-hover: rgb(113 113 122 / 0.75);
  --cab-scrollbar-track: rgb(244 244 245 / 0.65);
  --cab-preview-bg: #f4f4f5;
}
html.dark {
  --cab-scrollbar-thumb: rgb(82 82 91 / 0.6);
  --cab-scrollbar-thumb-hover: rgb(113 113 122 / 0.85);
  --cab-scrollbar-track: rgb(24 24 27 / 0.75);
  --cab-preview-bg: #27272a;
}
html, body {
  margin: 0;
  height: 100%;
  overflow: auto;
  overscroll-behavior: contain;
  background: var(--cab-preview-bg);
}
body {
  scrollbar-width: thin;
  scrollbar-color: var(--cab-scrollbar-thumb) var(--cab-scrollbar-track);
}
body::-webkit-scrollbar {
  width: var(--cab-scrollbar-size);
  height: var(--cab-scrollbar-size);
}
body::-webkit-scrollbar-track {
  background: var(--cab-scrollbar-track);
  border-radius: 9999px;
}
body::-webkit-scrollbar-thumb {
  background-color: var(--cab-scrollbar-thumb);
  border-radius: 9999px;
  border: 1px solid transparent;
  background-clip: padding-box;
}
body::-webkit-scrollbar-thumb:hover {
  background-color: var(--cab-scrollbar-thumb-hover);
}
body::-webkit-scrollbar-button {
  display: none;
  height: 0;
  width: 0;
}
iframe {
  display: block;
  width: 100%;
  border: 0;
  background: #fff;
}
`;

export function buildCapturePdfPreviewFrameHtml(input: {
  fileUrl: string;
  embedHeightPx: number;
  theme: PersistedThemeMode;
}): string {
  const darkClass = input.theme === "dark" ? ' class="dark"' : "";
  const pdfSrc = `${input.fileUrl}#toolbar=0&navpanes=0&scrollbar=0`;
  const height = Math.max(1, Math.round(input.embedHeightPx));

  return `<!DOCTYPE html>
<html lang="it"${darkClass}>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="color-scheme" content="${input.theme}" />
<style>${CAPTURE_PDF_PREVIEW_FRAME_CSS}</style>
</head>
<body class="gestionale-scrollbar">
<iframe title="PDF" src="${pdfSrc}" style="height:${height}px"></iframe>
</body>
</html>`;
}
