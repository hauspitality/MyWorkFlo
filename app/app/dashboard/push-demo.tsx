"use client";

import { useEffect, useState } from "react";
import { Button } from "@/app/_components/ui";
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
      setStatus({ text: "Push notifications aren’t available right now.", isError: true });
      return;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });

      await subscribeUser(sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } });
      setSubscription(sub);
    } catch {
      setStatus({ text: "Couldn’t enable push — check your browser’s notification permission.", isError: true });
    }
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
    return <p className="text-sm text-muted">Push notifications aren&rsquo;t supported in this browser.</p>;
  }

  return (
    <div>
      {subscription ? (
        <div className="space-y-3">
          <p className="text-sm text-ink-soft">
            <span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-gauge-green" />
            This device gets alerted when something needs your review.
          </p>
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-ink-soft">Test message</span>
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="h-10 w-full rounded-xl border border-line bg-paper px-3.5 text-sm outline-none transition-colors focus:border-accent-blue/50 focus:bg-card"
            />
          </label>
          <div className="flex gap-2">
            <Button onClick={handleSendTest}>Send test</Button>
            <Button variant="secondary" onClick={handleUnsubscribe}>
              Disable
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-ink-soft">Get alerted here the moment something needs your review.</p>
          <Button onClick={handleSubscribe}>Enable push notifications</Button>
        </div>
      )}
      {status && <p className={`mt-3 text-xs ${status.isError ? "text-gauge-red" : "text-ink-soft"}`}>{status.text}</p>}
    </div>
  );
}
