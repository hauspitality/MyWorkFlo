"use client";

import { useEffect, useState } from "react";
import { sendTestNotification, subscribeUser, unsubscribeUser } from "./actions";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

export function PushDemo() {
  const [supported, setSupported] = useState(false);
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [message, setMessage] = useState("Emergency call needs your review.");
  const [status, setStatus] = useState<{ text: string; isError: boolean } | null>(null);

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;

    navigator.serviceWorker.ready.then(async (registration) => {
      const existing = await registration.pushManager.getSubscription();
      setSupported(true);
      setSubscription(existing);
    });
  }, []);

  async function handleSubscribe() {
    setStatus(null);
    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidPublicKey) {
      setStatus({
        text: "Missing NEXT_PUBLIC_VAPID_PUBLIC_KEY — run `npx web-push generate-vapid-keys`.",
        isError: true,
      });
      return;
    }

    const registration = await navigator.serviceWorker.ready;
    const sub = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    });

    await subscribeUser(sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } });
    setSubscription(sub);
  }

  async function handleUnsubscribe() {
    if (!subscription) return;
    await subscription.unsubscribe();
    await unsubscribeUser(subscription.endpoint);
    setSubscription(null);
  }

  async function handleSendTest() {
    setStatus(null);
    const result = await sendTestNotification(message);
    setStatus({
      text: `Sent ${result.sent}, pruned ${result.pruned}, failed ${result.failed}.`,
      isError: result.failed > 0,
    });
  }

  if (!supported) {
    return (
      <div className="rounded-2xl border border-line bg-card p-5 shadow-card">
        <p className="text-xs text-muted">Push notifications aren&rsquo;t supported in this browser.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-line bg-card p-5 shadow-card">
      <h2 className="mb-1 text-sm font-semibold text-ink">Push notifications</h2>
      {subscription ? (
        <div className="space-y-3">
          <p className="text-xs text-muted">This device is subscribed.</p>
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-ink-soft">Test message</span>
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="h-10 w-full rounded-xl border border-line bg-paper px-3 text-sm outline-none transition-colors focus:border-accent-blue/50 focus:bg-card"
            />
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleSendTest}
              className="h-10 rounded-full bg-accent-blue px-4 text-[13px] font-semibold text-white hover:bg-accent-blue-deep"
            >
              Send test
            </button>
            <button
              type="button"
              onClick={handleUnsubscribe}
              className="h-10 rounded-full border border-line px-4 text-[13px] font-semibold text-ink-soft hover:bg-paper"
            >
              Disable
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-muted">
            Enable push to get alerted here when something needs your review.
          </p>
          <button
            type="button"
            onClick={handleSubscribe}
            className="h-10 rounded-full bg-accent-blue px-4 text-[13px] font-semibold text-white hover:bg-accent-blue-deep"
          >
            Enable push notifications
          </button>
        </div>
      )}
      {status && (
        <p className={`mt-3 text-xs ${status.isError ? "text-gauge-red" : "text-ink-soft"}`}>
          {status.text}
        </p>
      )}
    </div>
  );
}
