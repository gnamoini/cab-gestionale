import QRCode from "qrcode";

export async function generateQrPngBuffer(url: string, sizePx: number): Promise<Buffer> {
  return QRCode.toBuffer(url, {
    type: "png",
    width: sizePx,
    margin: 0,
    errorCorrectionLevel: "Q",
    color: { dark: "#000000", light: "#ffffff" },
  });
}

export async function generateQrSvgString(url: string, sizePx: number): Promise<string> {
  return QRCode.toString(url, {
    type: "svg",
    width: sizePx,
    margin: 0,
    errorCorrectionLevel: "Q",
    color: { dark: "#000000", light: "#ffffff" },
  });
}
