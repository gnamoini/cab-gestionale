import sharp from "sharp";

/** ponytail: sharp prebuilt libvips lacks poppler — pdfjs + @napi-rs/canvas (transitive via pdfjs-dist). */
export async function generatePdfThumbnailViaPdfJs(
  bytes: Uint8Array,
  maxWidth = 320,
): Promise<Uint8Array | null> {
  try {
    const { createCanvas } = await import("@napi-rs/canvas");
    const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
    const pdf = await getDocument({
      data: bytes,
      useSystemFonts: true,
      disableFontFace: true,
    }).promise;
    const page = await pdf.getPage(1);
    const baseViewport = page.getViewport({ scale: 1 });
    const scale = baseViewport.width > maxWidth ? maxWidth / baseViewport.width : 1;
    const viewport = page.getViewport({ scale });
    const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    await page.render({
      canvas: canvas as unknown as HTMLCanvasElement,
      canvasContext: ctx as unknown as CanvasRenderingContext2D,
      viewport,
    }).promise;

    const png = canvas.toBuffer("image/png");
    const out = await sharp(png)
      .rotate()
      .resize({ width: maxWidth, withoutEnlargement: true, fit: "inside" })
      .webp({ quality: 80 })
      .toBuffer();
    return new Uint8Array(out);
  } catch {
    return null;
  }
}
