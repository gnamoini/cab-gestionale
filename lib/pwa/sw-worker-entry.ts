/// <reference lib="webworker" />

declare const self: ServiceWorkerGlobalScope;
declare const __PWA_CACHE_VERSION__: string;

import { clientsClaim } from "workbox-core";
import { precacheAndRoute, cleanupOutdatedCaches } from "workbox-precaching";
import { registerRoute } from "workbox-routing";
import {
  CacheFirst,
  NetworkFirst,
  NetworkOnly,
  StaleWhileRevalidate,
} from "workbox-strategies";
import { ExpirationPlugin } from "workbox-expiration";
import { CacheableResponsePlugin } from "workbox-cacheable-response";
import { PWA_PRECACHE_URLS, pwaCacheName } from "@/lib/pwa/sw-cache";
import { classifyRequest } from "@/lib/pwa/sw-runtime";
import { PWA_OFFLINE_PATH } from "@/lib/pwa/sw-offline";
import { registerPushSwHandlers } from "@/lib/pwa/push-sw-handlers";

const CACHE_VERSION = __PWA_CACHE_VERSION__;

registerPushSwHandlers(self);

precacheAndRoute(
  PWA_PRECACHE_URLS.map((url) => ({
    url,
    revision: CACHE_VERSION,
  })),
);

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    void self.skipWaiting();
  }
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      cleanupOutdatedCaches();
      await clientsClaim();
    })(),
  );
});

const cacheableOk = new CacheableResponsePlugin({ statuses: [0, 200] });
const staticExpiration = new ExpirationPlugin({ maxEntries: 80, maxAgeSeconds: 30 * 24 * 60 * 60 });
const imageExpiration = new ExpirationPlugin({ maxEntries: 120, maxAgeSeconds: 14 * 24 * 60 * 60 });

registerRoute(
  ({ request, url }) => {
    if (request.method !== "GET") return false;
    return classifyRequest(url, request.method, request.mode) === "cache-first";
  },
  new CacheFirst({
    cacheName: pwaCacheName("static", CACHE_VERSION),
    plugins: [cacheableOk, staticExpiration],
  }),
);

registerRoute(
  ({ request, url }) => {
    if (request.method !== "GET") return false;
    return classifyRequest(url, request.method, request.mode) === "stale-while-revalidate";
  },
  new StaleWhileRevalidate({
    cacheName: pwaCacheName("images", CACHE_VERSION),
    plugins: [cacheableOk, imageExpiration],
  }),
);

registerRoute(
  ({ request, url }) => {
    if (request.method !== "GET") return false;
    return classifyRequest(url, request.method, request.mode) === "network-first";
  },
  new NetworkFirst({
    cacheName: pwaCacheName("pages", CACHE_VERSION),
    networkTimeoutSeconds: 3,
    plugins: [
      cacheableOk,
      {
        handlerDidError: async () => {
          const cache = await caches.open(pwaCacheName("pages", CACHE_VERSION));
          return (await cache.match(PWA_OFFLINE_PATH)) ?? Response.error();
        },
      },
    ],
  }),
);

registerRoute(
  ({ request, url }) => {
    if (request.method !== "GET") return false;
    return classifyRequest(url, request.method, request.mode) === "network-only";
  },
  new NetworkOnly(),
);
