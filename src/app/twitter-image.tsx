import { ImageResponse } from "next/og";

import { SocialCardFrame } from "@/components/shared/social-card-frame";

export const alt = "AI Product Intelligence Agent social preview";
export const size = {
  width: 1200,
  height: 675,
};
export const contentType = "image/png";

export default function TwitterImage() {
  return new ImageResponse(
    (
      <SocialCardFrame
        emphasis="A portfolio-ready intelligence product that reads like a real dashboard."
        supportingLine="See which AI products are shipping, where category momentum is clustering, and who is worth watching this week."
      />
    ),
    size,
  );
}
