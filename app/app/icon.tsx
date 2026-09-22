import { renderBrandIcon } from "@/lib/brand/icon-response";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return renderBrandIcon({ size: 32, markScale: 0.9 });
}
