"use client";

export function Greeting({ businessName }: { businessName: string }) {
  const now = new Date();
  const hour = now.getHours();
  const salutation = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const date = now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  return (
    <div>
      <p className="text-sm text-muted" suppressHydrationWarning>
        {date}
      </p>
      <h1 className="mt-1 text-3xl font-semibold tracking-tight text-ink lg:text-4xl" suppressHydrationWarning>
        {salutation}, {businessName}
      </h1>
    </div>
  );
}
