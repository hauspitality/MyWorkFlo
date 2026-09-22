import type { Metadata } from "next";
import { DemoClient } from "./demo-client";

export const metadata: Metadata = {
  title: "See it work — MyWorkFlo",
  description: "Watch the text your customers get the instant you miss a call. No signup, no sales call.",
};

function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
      <circle cx="50" cy="50" r="37" fill="none" stroke="#96692c" strokeWidth="7" />
      <line x1="50" y1="10" x2="50" y2="22" stroke="#96692c" strokeWidth="7" strokeLinecap="round" />
      <line x1="24" y1="22" x2="31" y2="29" stroke="#96692c" strokeWidth="7" strokeLinecap="round" />
      <line x1="76" y1="22" x2="69" y2="29" stroke="#96692c" strokeWidth="7" strokeLinecap="round" />
      <line x1="50" y1="50" x2="67" y2="28" stroke="#96692c" strokeWidth="7" strokeLinecap="round" />
      <circle cx="50" cy="50" r="7" fill="#96692c" />
      <polyline
        points="18,64 35,42 50,60 65,42 82,64"
        fill="none"
        stroke="#96692c"
        strokeWidth="7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function DemoPage() {
  // Public number to display for the "call & watch" theater. Server components
  // read the same NEXT_PUBLIC_ var for the From when texting back.
  const demoNumber = process.env.NEXT_PUBLIC_DEMO_PHONE_NUMBER ?? null;

  return (
    <main className="mx-auto flex min-h-full w-full max-w-xl flex-1 flex-col px-5 py-12 sm:py-16">
      <div className="mb-8 flex items-center gap-2.5">
        <BrandMark className="h-7 w-7" />
        <span className="text-lg font-semibold">MyWorkFlo</span>
      </div>

      <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
        See exactly what your customer gets when you can&rsquo;t pick up.
      </h1>
      <p className="mt-2 text-sm text-muted sm:text-base">
        No signup, no sales call. Run it on your own phone in ten seconds.
      </p>

      <div className="mt-8">
        <DemoClient demoNumber={demoNumber} />
      </div>

      <p className="mt-8 text-xs text-faint">
        We text the number you give us once, to show you the sample. Standard message rates may apply. Reply STOP to
        opt out.
      </p>
    </main>
  );
}
