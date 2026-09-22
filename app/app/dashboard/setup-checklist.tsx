"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { Button } from "@/app/_components/ui";
import { subscribeUser } from "./actions";

const DISMISS_KEY = "mwf:setup-checklist-dismissed";

function noopSubscribe() {
  return () => {};
}

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

function getIosSnapshot() {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

function CheckIcon({ done }: { done: boolean }) {
  if (done) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-5 w-5 shrink-0 text-gauge-green" aria-hidden>
        <circle cx="12" cy="12" r="8.5" />
        <path d="m8.5 12.2 2.4 2.4 4.6-5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-5 w-5 shrink-0 text-faint" aria-hidden>
      <circle cx="12" cy="12" r="8.5" />
    </svg>
  );
}

export function SetupChecklist({ calendarConnected, planActive }: { calendarConnected: boolean; planActive: boolean }) {
  // Server/hydration snapshots hide the card until the client knows the real state.
  const mounted = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const standalone = useSyncExternalStore(subscribeToStandalone, getStandaloneSnapshot, () => true);
  const ios = useSyncExternalStore(noopSubscribe, getIosSnapshot, () => false);
  const [dismissedNow, setDismissedNow] = useState(false);
  const [pushState, setPushState] = useState<"unsupported" | "off" | "on" | "enabling" | "failed">("unsupported");

  const dismissed = dismissedNow || (mounted && localStorage.getItem(DISMISS_KEY) === "1");

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
    navigator.serviceWorker.ready.then(async (registration) => {
      const existing = await registration.pushManager.getSubscription();
      setPushState(existing ? "on" : "off");
    });
  }, []);

  async function enablePush() {
    setPushState("enabling");
    try {
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidPublicKey) throw new Error("push not configured");
      const registration = await navigator.serviceWorker.ready;
      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });
      await subscribeUser(sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } });
      setPushState("on");
    } catch {
      setPushState("failed");
    }
  }

  function hide() {
    localStorage.setItem(DISMISS_KEY, "1");
    setDismissedNow(true);
  }

  if (!mounted || dismissed) return null;

  const items = [
    {
      key: "calendar",
      done: calendarConnected,
      label: "Connect Google Calendar",
      description: "Real availability and bookings straight onto your calendar.",
      action: <Link href="/dashboard/settings" className="text-[13px] font-medium text-accent-blue hover:text-accent-blue-deep">Connect</Link>,
    },
    {
      key: "plan",
      done: planActive,
      label: "Pick a plan",
      description: "Choose the plan that fits your team.",
      action: <Link href="/dashboard/settings" className="text-[13px] font-medium text-accent-blue hover:text-accent-blue-deep">Choose</Link>,
    },
    {
      key: "push",
      done: pushState === "on",
      label: "Turn on notifications",
      description:
        pushState === "unsupported"
          ? "Not available in this browser."
          : pushState === "failed"
            ? "Notifications aren’t available right now — you can retry from Settings."
            : "Get alerted the moment something needs your approval.",
      action:
        pushState === "off" || pushState === "enabling" ? (
          <Button variant="secondary" onClick={enablePush} disabled={pushState === "enabling"}>
            {pushState === "enabling" ? "Enabling…" : "Enable"}
          </Button>
        ) : null,
    },
    {
      key: "install",
      done: standalone,
      label: "Add to your home screen",
      description: ios
        ? "In Safari: Share → Add to Home Screen."
        : "Use your browser’s “Install app” option (address bar or ⋮ menu).",
      action: null,
    },
  ];

  const remaining = items.filter((i) => !i.done).length;
  if (remaining === 0) return null;

  return (
    <div className="rounded-2xl border border-line bg-card shadow-card">
      <div className="flex items-center justify-between gap-3 px-5 pb-1 pt-4 sm:px-6 sm:pt-5">
        <h2 className="flex items-center gap-2 text-[15px] font-semibold text-ink">
          Finish setting up
          <span className="rounded-full bg-accent-blue-soft px-2 py-0.5 text-xs font-semibold tabular-nums text-accent-blue">{remaining}</span>
        </h2>
        <button onClick={hide} className="rounded-full px-3 py-1.5 text-[13px] font-medium text-muted transition-colors hover:bg-paper hover:text-ink">
          Hide
        </button>
      </div>
      <div className="px-5 pb-3 sm:px-6">
        {items.map((item, i) => (
          <div key={item.key} className={"flex items-center gap-3 py-3 " + (i > 0 ? "border-t border-dashed border-line" : "")}>
            <CheckIcon done={item.done} />
            <div className="min-w-0 flex-1">
              <p className={"text-sm font-medium " + (item.done ? "text-muted line-through" : "text-ink")}>{item.label}</p>
              {!item.done && <p className="mt-0.5 text-xs text-muted">{item.description}</p>}
            </div>
            {!item.done && item.action && <div className="shrink-0">{item.action}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}
