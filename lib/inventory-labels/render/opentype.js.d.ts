declare module "opentype.js" {
  export class Path {
    extend(path: Path): void;
    toPathData(decimalPlaces?: number): string;
  }

  export interface Font {
    unitsPerEm: number;
    ascender: number;
    charToGlyph(char: string): { advanceWidth?: number };
    getPath(text: string, x: number, y: number, fontSize: number): Path;
  }

  export function parse(buffer: ArrayBuffer): Font;
}
