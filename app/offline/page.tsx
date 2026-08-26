export { offlinePageMetadata as metadata } from "@/lib/site/app-page-metadata";

import { OfflinePageViewLazy } from "@/components/public-surfaces/public-surface-loaders";

export default function OfflinePage() {
  return <OfflinePageViewLazy />;
}
