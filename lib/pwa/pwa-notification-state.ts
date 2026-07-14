/** Apertura programmatica drawer notifiche (push / deep link). */

let openVersion = 0;
const listeners = new Set<() => void>();

export function getNotificationCenterOpenSnapshot(): number {
  return openVersion;
}

export function subscribeNotificationCenterOpen(onStoreChange: () => void): () => void {
  listeners.add(onStoreChange);
  return () => listeners.delete(onStoreChange);
}

export function requestOpenNotificationCenter(): void {
  openVersion += 1;
  for (const listener of listeners) listener();
}

export function resetNotificationCenterOpenForTests(): void {
  openVersion = 0;
  listeners.clear();
}
