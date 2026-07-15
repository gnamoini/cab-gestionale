/**
 * Genera icone PWA da public/cab-logo.png (logo CAB su tile arrotondata scura).
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
import { PWA_BACKGROUND_COLOR, PWA_ICON_TILE_COLOR } from "@/lib/pwa/pwa-config";

const ROOT = process.cwd();
const LOGO_PATH = path.join(ROOT, "public", "cab-logo.png");
const ICONS_DIR = path.join(ROOT, "public", "icons");
const MASTER_SIZE = 1024;

/** Tile arrotondata — ~88% canvas, raggio ~22% lato tile (stile app iOS/Android). */
const TILE_SIZE_RATIO = 0.88;
const TILE_RADIUS_RATIO = 0.22;

type Rgb = { r: number; g: number; b: number };

function hexToRgb(hex: string): Rgb {
  const normalized = hex.replace("#", "");
  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16),
  };
}

function colorDistance(a: Rgb, b: Rgb): number {
  return Math.abs(a.r - b.r) + Math.abs(a.g - b.g) + Math.abs(a.b - b.b);
}

function roundedTileSvg(input: {
  canvasSize: number;
  tileSize: number;
  radius: number;
  fill: string;
  fullBleed?: boolean;
}): Buffer {
  const { canvasSize, tileSize, radius, fill, fullBleed = false } = input;
  const offset = fullBleed ? 0 : Math.round((canvasSize - tileSize) / 2);
  const width = fullBleed ? canvasSize : tileSize;
  const height = fullBleed ? canvasSize : tileSize;
  const rx = fullBleed ? Math.round(canvasSize * TILE_RADIUS_RATIO) : radius;

  return Buffer.from(
    `<svg width="${canvasSize}" height="${canvasSize}" xmlns="http://www.w3.org/2000/svg">
      <rect x="${offset}" y="${offset}" width="${width}" height="${height}" rx="${rx}" ry="${rx}" fill="${fill}"/>
    </svg>`,
  );
}

async function resizeLogo(maxLogoWidth: number): Promise<{ buffer: Buffer; width: number; height: number }> {
  const logo = sharp(LOGO_PATH);
  const meta = await logo.metadata();
  const logoWidth = meta.width ?? 790;
  const logoHeight = meta.height ?? 226;
  const scale = maxLogoWidth / logoWidth;
  const resizedWidth = maxLogoWidth;
  const resizedHeight = Math.round(logoHeight * scale);
  const buffer = await logo.resize(resizedWidth, resizedHeight, { fit: "inside" }).png().toBuffer();
  return { buffer, width: resizedWidth, height: resizedHeight };
}

async function buildIconMaster(input: {
  logoMaxWidthRatio: number;
  fullBleedTile?: boolean;
  transparentCanvas?: boolean;
}): Promise<Buffer> {
  const tileSize = Math.round(MASTER_SIZE * TILE_SIZE_RATIO);
  const tileRadius = Math.round(tileSize * TILE_RADIUS_RATIO);
  const effectiveTile = input.fullBleedTile ? MASTER_SIZE : tileSize;
  const maxLogoWidth = Math.round(effectiveTile * input.logoMaxWidthRatio);
  const { buffer: resizedLogo, width: logoWidth, height: logoHeight } = await resizeLogo(maxLogoWidth);

  const tile = roundedTileSvg({
    canvasSize: MASTER_SIZE,
    tileSize,
    radius: tileRadius,
    fill: PWA_ICON_TILE_COLOR,
    fullBleed: input.fullBleedTile,
  });

  const left = Math.round((MASTER_SIZE - logoWidth) / 2);
  const top = Math.round((MASTER_SIZE - logoHeight) / 2);
  const canvasBg = input.transparentCanvas
    ? { r: 0, g: 0, b: 0, alpha: 0 }
    : { ...hexToRgb(PWA_BACKGROUND_COLOR), alpha: 1 };

  return sharp({
    create: {
      width: MASTER_SIZE,
      height: MASTER_SIZE,
      channels: 4,
      background: canvasBg,
    },
  })
    .composite([
      { input: tile, left: 0, top: 0 },
      { input: resizedLogo, left, top },
    ])
    .png()
    .toBuffer();
}

async function buildMonochrome(master: Buffer): Promise<Buffer> {
  const { data, info } = await sharp(master).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const out = Buffer.from(data);
  const tile = hexToRgb(PWA_ICON_TILE_COLOR);
  const outer = hexToRgb(PWA_BACKGROUND_COLOR);

  for (let i = 0; i < out.length; i += 4) {
    const r = out[i]!;
    const g = out[i + 1]!;
    const b = out[i + 2]!;
    const a = out[i + 3]!;
    const pixel = { r, g, b };
    const isTransparent = a < 16;
    const isBackground =
      isTransparent || colorDistance(pixel, tile) < 36 || colorDistance(pixel, outer) < 36;
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

  const master = await buildIconMaster({
    logoMaxWidthRatio: 0.76,
    transparentCanvas: true,
  });
  const maskable = await buildIconMaster({
    logoMaxWidthRatio: 0.62,
    fullBleedTile: true,
    transparentCanvas: false,
  });
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
