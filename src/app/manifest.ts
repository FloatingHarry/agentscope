import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "AI Product Intelligence Agent",
    short_name: "AI Intelligence",
    description:
      "A mock-first competitive intelligence dashboard for tracking AI product updates, comparing competitors, and generating weekly briefs.",
    start_url: "/",
    display: "standalone",
    background_color: "#f7f5ef",
    theme_color: "#f7f5ef",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
