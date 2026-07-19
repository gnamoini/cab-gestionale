import type { DeliveryProvider } from "@/lib/notifications/delivery/providers/delivery-provider";
import { noopProvider } from "@/lib/notifications/delivery/providers/noop-provider";
import { captureProvider } from "@/lib/notifications/delivery/providers/capture-provider";
import { realtimeProvider } from "@/lib/notifications/delivery/providers/realtime-provider";
import { webPushProvider } from "@/lib/notifications/delivery/providers/web-push-provider.server";
import { desktopProvider } from "@/lib/notifications/delivery/providers/desktop-provider";

const registry = new Map<string, DeliveryProvider>([
  [noopProvider.id, noopProvider],
  [captureProvider.id, captureProvider],
  [realtimeProvider.id, realtimeProvider],
  [webPushProvider.id, webPushProvider],
  [desktopProvider.id, desktopProvider],
]);

export function getDeliveryProvider(id: string): DeliveryProvider | undefined {
  return registry.get(id);
}

export function registerDeliveryProvider(provider: DeliveryProvider): void {
  registry.set(provider.id, provider);
}
