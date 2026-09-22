import { redirect } from "next/navigation";

/** The simulator grew up into a product feature — "Test your AI" at /dashboard/test. */
export default function LegacySimulatePage() {
  redirect("/dashboard/test");
}
