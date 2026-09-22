import { renderBrandIcon } from "@/lib/brand/icon-response";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// iOS fills transparent apple-touch-icons with black, so give it the same
// dark-ink background as the maskable PWA icon.
const APPLE_ICON_BACKGROUND = "#17181a";

export default function AppleIcon() {
  return renderBrandIcon({ size: 180, background: APPLE_ICON_BACKGROUND, markScale: 0.66 });
}
