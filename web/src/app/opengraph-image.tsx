import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const alt = "Blood Bank Kerala: volunteer console";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const FONT_DIR = join(process.cwd(), "node_modules/@fontsource/anek-malayalam/files");

// Link preview when the console URL is shared on WhatsApp or elsewhere.
export default async function OpengraphImage() {
  const [bold, extraBold] = await Promise.all([
    readFile(join(FONT_DIR, "anek-malayalam-latin-700-normal.woff")),
    readFile(join(FONT_DIR, "anek-malayalam-latin-800-normal.woff")),
  ]);

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 72, background: "#a3142b", color: "#fff", fontFamily: "Anek" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 38, fontWeight: 700 }}>
          <svg width="44" height="44" viewBox="0 0 64 64">
            <path d="M32 11c-1 0-1.9.5-2.4 1.3C24.5 20 17 29.6 17 37.5 17 45.8 23.7 52 32 52s15-6.2 15-14.5c0-7.9-7.5-17.5-12.6-25.2-.5-.8-1.4-1.3-2.4-1.3z" fill="#fff" />
          </svg>
          Blood Bank Kerala
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: 150, fontWeight: 800, letterSpacing: -6, lineHeight: 1, color: "rgba(255,255,255,0.16)" }}>
            A+ B+ O+ AB+
          </div>
          <div style={{ display: "flex", marginTop: 28, fontSize: 60, fontWeight: 800, lineHeight: 1.1, maxWidth: 980 }}>
            Find the right donor in any of Kerala&apos;s 14 districts.
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Anek", data: bold, weight: 700, style: "normal" },
        { name: "Anek", data: extraBold, weight: 800, style: "normal" },
      ],
    },
  );
}
