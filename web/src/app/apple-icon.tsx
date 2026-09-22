import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// Home-screen icon: white drop on the brand red, matching icon.svg.
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#a3142b" }}>
        <svg width="112" height="112" viewBox="0 0 64 64">
          <path d="M32 11c-1 0-1.9.5-2.4 1.3C24.5 20 17 29.6 17 37.5 17 45.8 23.7 52 32 52s15-6.2 15-14.5c0-7.9-7.5-17.5-12.6-25.2-.5-.8-1.4-1.3-2.4-1.3z" fill="#fff" />
        </svg>
      </div>
    ),
    size,
  );
}
