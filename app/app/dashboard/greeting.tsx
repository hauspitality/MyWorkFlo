"use client";

export function Greeting({ businessName }: { businessName?: string | null }) {
  const now = new Date();
  const hour = now.getHours();
  const salutation = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const date = now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  const name = businessName?.trim();

  return (
    <div>
      <p className="text-sm text-muted" suppressHydrationWarning>
        {date}
      </p>
      <h1 className="mt-1 text-3xl font-semibold tracking-tight text-ink lg:text-4xl" suppressHydrationWarning>
        {name ? `${salutation}, ${name}` : salutation}
      </h1>
    </div>
  );
}
