import { ImageResponse } from "next/og";
import { brandMarkSvg } from "./mark";

const BRASS = "#96692c";

interface RenderBrandIconOptions {
  size: number;
  markColor?: string;
  /** Undefined renders a transparent background (tab favicon). */
  background?: string;
  /** Fraction of the canvas the mark occupies — controls safe-zone padding. */
  markScale?: number;
}

export function renderBrandIcon({
  size,
  markColor = BRASS,
  background,
  markScale = 0.86,
}: RenderBrandIconOptions) {
  const svg = brandMarkSvg(markColor);
  const dataUri = `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
  const markSize = Math.round(size * markScale);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: background ?? "transparent",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={dataUri} width={markSize} height={markSize} alt="" />
      </div>
    ),
    { width: size, height: size },
  );
}
