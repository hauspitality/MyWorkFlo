"use client";

import { useState, type FormEvent } from "react";
import { Button, ButtonLink, Card } from "@/app/_components/ui";

function displayPhone(raw: string | null): string {
  if (!raw) return "";
  const d = raw.replace(/\D/g, "");
  const ten = d.length === 11 && d.startsWith("1") ? d.slice(1) : d;
  if (ten.length !== 10) return raw;
  return `(${ten.slice(0, 3)}) ${ten.slice(3, 6)}-${ten.slice(6)}`;
}

function PhoneIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className={className}>
      <path
        d="M6.5 4h3l1.5 4-2 1.5a11 11 0 0 0 5 5l1.5-2 4 1.5v3a1.5 1.5 0 0 1-1.6 1.5A15.5 15.5 0 0 1 5 6.6 1.5 1.5 0 0 1 6.5 4Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function DemoClient({ demoNumber }: { demoNumber: string | null }) {
  const [phone, setPhone] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setStatus("sending");
    setMessage(null);
    try {
      const res = await fetch("/api/demo/text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, businessName }),
      });
      const data = (await res.json()) as { ok: boolean; message?: string; error?: string };
      if (!res.ok || !data.ok) {
        setStatus("error");
        setMessage(data.error ?? "Something went wrong. Try again.");
        return;
      }
      setStatus("done");
      setMessage(data.message ?? "Check your phone.");
    } catch {
      setStatus("error");
      setMessage("Something went wrong. Try again.");
    }
  }

  if (status === "done") {
    return (
      <Card className="p-6 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gauge-green-soft">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6 text-gauge-green" aria-hidden>
            <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <p className="mt-3 text-sm font-medium text-ink">{message}</p>
        <p className="mt-1 text-xs text-muted">
          That&rsquo;s the exact text your customers would get — in seconds, every time you miss a call.
        </p>
        <div className="mt-5 space-y-2.5">
          <ButtonLink href="/login?next=/onboarding" size="lg">
            Start your free 14-day trial
          </ButtonLink>
          <button
            onClick={() => {
              setStatus("idle");
              setMessage(null);
            }}
            className="block w-full text-center text-[13px] font-medium text-muted transition-colors hover:text-ink"
          >
            Send it to another number
          </button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Call & watch — the real product moment, shown only when a demo line is live */}
      {demoNumber && (
        <Card className="p-5 sm:p-6">
          <div className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-wide text-accent-blue">
            <PhoneIcon className="h-4 w-4" />
            Best way to see it
          </div>
          <p className="mt-2 text-sm text-ink-soft">
            From your business phone, call the number below, let it ring, and hang up. Watch the text land on your
            phone — that&rsquo;s what your customer gets.
          </p>
          <a
            href={`tel:${demoNumber}`}
            className="mt-3 block rounded-xl bg-paper px-4 py-3 text-center text-xl font-semibold tabular-nums text-ink transition-colors hover:bg-accent-blue-soft"
          >
            {displayPhone(demoNumber)}
          </a>
        </Card>
      )}

      {/* Text-me form — always available, and the primary path before the line is live */}
      <Card className="p-5 sm:p-6">
        <h2 className="text-[15px] font-semibold text-ink">
          {demoNumber ? "Or have us text you the sample" : "Text me the sample"}
        </h2>
        <form onSubmit={handleSubmit} className="mt-3 space-y-3">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-ink-soft">Your mobile number</span>
            <input
              type="tel"
              required
              inputMode="tel"
              autoComplete="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(555) 555-0100"
              className="h-12 w-full rounded-xl border border-line bg-paper px-4 text-base tabular-nums outline-none transition-colors focus:border-accent-blue/50 focus:bg-card"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-ink-soft">
              Business name <span className="font-normal text-muted">(optional — makes the demo yours)</span>
            </span>
            <input
              type="text"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="Weldon Heating &amp; Air"
              className="h-12 w-full rounded-xl border border-line bg-paper px-4 text-base outline-none transition-colors focus:border-accent-blue/50 focus:bg-card"
            />
          </label>
          {status === "error" && message && <p className="text-sm text-gauge-red">{message}</p>}
          <Button type="submit" size="lg" disabled={status === "sending"}>
            {status === "sending" ? "Sending…" : "Text me the sample"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
