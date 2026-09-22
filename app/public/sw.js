// Plain, unbundled service worker — intentionally not run through the
// TypeScript/Next.js build pipeline. Served verbatim at the site root
// (see next.config.ts headers()) so it can be registered with scope: "/"
// with no extra Service-Worker-Allowed header required.

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "MyWorkFlo", body: event.data.text() };
  }

  const options = {
    body: payload.body,
    icon: payload.icon || "/icons/icon-192",
    badge: payload.badge || "/icons/icon-192",
    data: { url: payload.url || "/" },
  };

  event.waitUntil(self.registration.showNotification(payload.title || "MyWorkFlo", options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url === targetUrl && "focus" in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
    }),
  );
});
