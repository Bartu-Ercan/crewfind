import { ImageResponse } from "next/og";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "16px", background: "#15171b", color: "#0f2b23", fontSize: "34px", fontWeight: 800 }}>
      <span style={{ width: "48px", height: "42px", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "999px", background: "#b8f7e4" }}>C</span>
    </div>,
    size,
  );
}
