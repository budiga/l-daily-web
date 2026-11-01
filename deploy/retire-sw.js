// Emergency rollback only: serve this file at /sw.js with Cache-Control:
// no-cache. It deliberately never reloads clients or touches diary storage.
self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names
          .filter((name) => name.startsWith("simple-diary-"))
          .map((name) => caches.delete(name)),
      );
      await self.registration.unregister();
    })(),
  );
});
