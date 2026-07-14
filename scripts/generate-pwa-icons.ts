/**
 * Genera icone PWA da public/cab-logo.png (composita quadrata su sfondo brand).
 * Eseguire: npm run pwa:icons
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import toIco from "to-ico";
import {
  PWA_APPLE_TOUCH_SIZES,
  PWA_ICON_BASE_PATH,
  PWA_ICON_SIZES,
  PWA_MASKABLE_ICON_PATH,
  PWA_MONOCHROME_ICON_PATH,
} from "@/lib/pwa/pwa-icons";
import { PWA_THEME_COLOR } from "@/lib/pwa/pwa-config";

const ROOT = process.cwd();
const LOGO_PATH = path.join(ROOT, "public", "cab-logo.png");
const ICONS_DIR = path.join(ROOT, "public", "icons");
const MASTER_SIZE = 1024;

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const normalized = hex.replace("#", "");
  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16),
  };
}

async function buildMasterSquare(logoMaxWidthRatio: number): Promise<Buffer> {
  const logo = sharp(LOGO_PATH);
  const meta = await logo.metadata();
  const logoWidth = meta.width ?? 790;
  const logoHeight = meta.height ?? 226;

  const maxLogoWidth = Math.round(MASTER_SIZE * logoMaxWidthRatio);
  const scale = maxLogoWidth / logoWidth;
  const resizedHeight = Math.round(logoHeight * scale);

  const resizedLogo = await logo.resize(maxLogoWidth, resizedHeight, { fit: "inside" }).png().toBuffer();

  const left = Math.round((MASTER_SIZE - maxLogoWidth) / 2);
  const top = Math.round((MASTER_SIZE - resizedHeight) / 2);
  const { r, g, b } = hexToRgb(PWA_THEME_COLOR);

  return sharp({
    create: {
      width: MASTER_SIZE,
      height: MASTER_SIZE,
      channels: 4,
      background: { r, g, b, alpha: 1 },
    },
  })
    .composite([{ input: resizedLogo, left, top }])
    .png()
    .toBuffer();
}

async function buildMonochrome(master: Buffer): Promise<Buffer> {
  const { data, info } = await sharp(master).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const out = Buffer.from(data);
  const bg = hexToRgb(PWA_THEME_COLOR);

  for (let i = 0; i < out.length; i += 4) {
    const r = out[i]!;
    const g = out[i + 1]!;
    const b = out[i + 2]!;
    const a = out[i + 3]!;
    const isBackground =
      a < 16 ||
      (Math.abs(r - bg.r) < 24 && Math.abs(g - bg.g) < 24 && Math.abs(b - bg.b) < 24);
    if (isBackground) {
      out[i + 3] = 0;
    } else {
      out[i] = 255;
      out[i + 1] = 255;
      out[i + 2] = 255;
      out[i + 3] = 255;
    }
  }

  return sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } })
    .png()
    .toBuffer();
}

function publicIconPath(relativePath: string): string {
  return path.join(ROOT, "public", relativePath.replace(/^\//, ""));
}

async function main(): Promise<void> {
  if (!fs.existsSync(LOGO_PATH)) {
    throw new Error(`Logo sorgente mancante: ${LOGO_PATH}`);
  }

  fs.mkdirSync(ICONS_DIR, { recursive: true });

  const master = await buildMasterSquare(0.7);
  const maskable = await buildMasterSquare(0.56);
  const monochrome = await buildMonochrome(master);

  for (const size of PWA_ICON_SIZES) {
    const outPath = publicIconPath(`${PWA_ICON_BASE_PATH}/icon-${size}x${size}.png`);
    await sharp(master).resize(size, size).png().toFile(outPath);
  }

  for (const size of PWA_APPLE_TOUCH_SIZES) {
    const outPath = publicIconPath(`${PWA_ICON_BASE_PATH}/apple-touch-icon-${size}x${size}.png`);
    await sharp(master).resize(size, size).png().toFile(outPath);
  }

  await sharp(maskable).resize(512, 512).png().toFile(publicIconPath(PWA_MASKABLE_ICON_PATH));
  await sharp(monochrome).resize(512, 512).png().toFile(publicIconPath(PWA_MONOCHROME_ICON_PATH));

  const faviconSizes = [16, 32, 48] as const;
  const faviconPngs = await Promise.all(
    faviconSizes.map((size) => sharp(master).resize(size, size).png().toBuffer()),
  );
  const faviconIco = await toIco(faviconPngs);
  fs.writeFileSync(publicIconPath(`${PWA_ICON_BASE_PATH}/favicon.ico`), faviconIco);

  console.log(`pwa:icons — generate ${PWA_ICON_SIZES.length + PWA_APPLE_TOUCH_SIZES.length + 3} asset in public/icons/`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
