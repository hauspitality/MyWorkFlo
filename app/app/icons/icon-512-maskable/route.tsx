import { renderBrandIcon } from "@/lib/brand/icon-response";

export const dynamic = "force-static";

// Dark-ink background behind the brass mark — maskable icons need a solid
// fill since OS launchers crop transparent ones unpredictably.
const MASKABLE_BACKGROUND = "#17181a";

export function GET() {
  return renderBrandIcon({
    size: 512,
    background: MASKABLE_BACKGROUND,
    // Keeps the mark inside the ~80%-diameter OS safe-zone circle.
    markScale: 0.62,
  });
}
