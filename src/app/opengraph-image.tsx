import { ImageResponse } from "next/og";

import { SocialCardFrame } from "@/components/shared/social-card-frame";

export const alt = "AI Product Intelligence Agent share card";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <SocialCardFrame
        emphasis="Competitive monitoring, trend reading, and weekly product brief generation."
        supportingLine="Mock-first competitive intelligence dashboard for following product updates, comparing category focus, and generating weekly AI market readouts."
      />
    ),
    size,
  );
}
