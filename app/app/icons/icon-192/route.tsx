import { renderBrandIcon } from "@/lib/brand/icon-response";

export const dynamic = "force-static";

export function GET() {
  return renderBrandIcon({ size: 192, markScale: 0.82 });
}
