import type { MetadataRoute } from "next";
import { buildPwaManifest } from "@/lib/pwa";

export default function manifest(): MetadataRoute.Manifest {
  return buildPwaManifest();
}
