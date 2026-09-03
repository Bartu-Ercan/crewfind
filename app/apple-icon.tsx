import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "42px", background: "#15171b", color: "#0f2b23", fontSize: "92px", fontWeight: 800 }}>
      <span style={{ width: "136px", height: "116px", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "999px", background: "#b8f7e4" }}>C</span>
    </div>,
    size,
  );
}
