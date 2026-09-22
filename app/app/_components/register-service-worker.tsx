"use client";

import { useEffect } from "react";

// Not mounted anywhere yet — drop this into layout.tsx's <body> once the
// auth/dashboard shell work in progress elsewhere has settled.
export function RegisterServiceWorker() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .catch((error) => console.error("Service worker registration failed:", error));
  }, []);

  return null;
}
