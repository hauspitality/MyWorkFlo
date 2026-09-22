"use client";

import { useSyncExternalStore } from "react";

function subscribeToStandalone(callback: () => void) {
  const mql = window.matchMedia("(display-mode: standalone)");
  mql.addEventListener("change", callback);
  return () => mql.removeEventListener("change", callback);
}

function getStandaloneSnapshot() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS Safari's non-standard flag for "launched from home screen".
    (navigator as { standalone?: boolean }).standalone === true
  );
}

// Assume installed on the server so the install prompt doesn't flash before
// hydration can confirm otherwise.
function getStandaloneServerSnapshot() {
  return true;
}

function noopSubscribe() {
  return () => {};
}

function getIosSnapshot() {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

function getIosServerSnapshot() {
  return false;
}

export function InstallPrompt() {
  const standalone = useSyncExternalStore(
    subscribeToStandalone,
    getStandaloneSnapshot,
    getStandaloneServerSnapshot,
  );
  const ios = useSyncExternalStore(noopSubscribe, getIosSnapshot, getIosServerSnapshot);

  if (standalone) {
    return (
      <div className="rounded-2xl border border-line bg-card p-5 shadow-card">
        <h2 className="text-sm font-semibold text-ink">Installed</h2>
        <p className="mt-1 text-xs text-muted">You&rsquo;re running MyWorkFlo as an installed app.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-line bg-card p-5 shadow-card">
      <h2 className="text-sm font-semibold text-ink">Add to your home screen</h2>
      {ios ? (
        <p className="mt-1 text-xs text-muted">
          Tap the Share icon in Safari, then <strong className="font-medium text-ink-soft">Add to Home Screen</strong>.
        </p>
      ) : (
        <p className="mt-1 text-xs text-muted">
          Use your browser&rsquo;s <strong className="font-medium text-ink-soft">Install app</strong> option (usually in the
          address bar or the ⋮ menu) to add MyWorkFlo to your home screen.
        </p>
      )}
    </div>
  );
}
