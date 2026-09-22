"use client";

import { useRouter } from "next/navigation";

/**
 * Whole-row navigation for the desktop leads table. The customer-cell link
 * stays the single keyboard/tab target; this just honors clicks anywhere on
 * the row (which the hover tint already promises).
 */
export function LeadRow({ href, className = "", children }: { href: string; className?: string; children: React.ReactNode }) {
  const router = useRouter();

  return (
    <tr
      onClick={(event) => {
        // Real links inside the row (the customer cell) handle themselves.
        if ((event.target as HTMLElement).closest("a")) return;
        router.push(href);
      }}
      className={"cursor-pointer " + className}
    >
      {children}
    </tr>
  );
}
