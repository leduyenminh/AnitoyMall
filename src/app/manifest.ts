import type { MetadataRoute } from "next";
import { site } from "@/lib/site";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: site.name,
    short_name: site.shortName,
    description: site.tagline,
    start_url: "/",
    display: "standalone",
    background_color: "#fffafc",
    theme_color: "#fe2c55",
    lang: "vi",
    icons: [{ src: "/icon.png", sizes: "512x512", type: "image/png" }],
  };
}
