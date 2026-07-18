import sharp from "sharp";

const DARK_RGB_SUM_THRESHOLD = 30;
const MIN_DARK_PIXELS = 40;

/** ponytail: soglia pixel scuri — upgrade: adaptive threshold per scansione grigia */
export async function pngBufferHasSignatureInk(buf: Buffer): Promise<boolean> {
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const channels = info.channels ?? 3;
  let darkPixels = 0;
  for (let i = 0; i < data.length; i += channels) {
    const sum = data[i]! + data[i + 1]! + data[i + 2]!;
    if (sum < DARK_RGB_SUM_THRESHOLD) {
      darkPixels += 1;
      if (darkPixels >= MIN_DARK_PIXELS) return true;
    }
  }
  return false;
}
