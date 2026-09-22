import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Blood Bank Kerala",
    short_name: "Blood Bank",
    description: "Volunteer console for blood requests, donors and donations across Kerala.",
    start_url: "/",
    display: "standalone",
    background_color: "#f1e9e5",
    theme_color: "#7c0e20",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
