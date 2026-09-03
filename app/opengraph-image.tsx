import { ImageResponse } from "next/og";

export const alt = "CrewFind ile VALORANT, League of Legends ve CS2 takım arkadaşı bul";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", padding: "68px", display: "flex", alignItems: "center", justifyContent: "space-between", background: "#15171b", color: "#eafff6", fontFamily: "Arial, sans-serif" }}>
      <div style={{ width: "650px", display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
        <div style={{ display: "flex", alignItems: "center", fontSize: "58px", fontWeight: 700, letterSpacing: "-3px" }}>
          <span style={{ padding: "4px 20px", borderRadius: "999px", background: "#b8f7e4", color: "#0f2b23" }}>Crew</span>
          <span>Find</span>
          <span style={{ marginLeft: "16px", padding: "6px 11px", border: "1px solid #48504d", borderRadius: "999px", color: "#8f9a97", fontSize: "15px", letterSpacing: "2px" }}>BETA</span>
        </div>
        <div style={{ marginTop: "56px", display: "flex", flexDirection: "column" }}>
          <span style={{ color: "#b8f7e4", fontSize: "19px", fontWeight: 700, letterSpacing: "3px" }}>TAKIM BULMANIN KISA YOLU</span>
          <strong style={{ marginTop: "14px", fontSize: "62px", lineHeight: 1.04, letterSpacing: "-2px" }}>Eksik oyuncuyu bul.</strong>
          <span style={{ marginTop: "22px", color: "#8f9a97", fontSize: "24px" }}>VALORANT · League of Legends · CS2</span>
        </div>
      </div>
      <div style={{ width: "330px", padding: "30px", display: "flex", flexDirection: "column", border: "1px solid #2a2e34", borderRadius: "28px", background: "#1e2126" }}>
        <span style={{ color: "#6b7570", fontSize: "15px", fontWeight: 700, letterSpacing: "2px" }}>EŞLEŞTİRME</span>
        <strong style={{ marginTop: "12px", fontSize: "33px" }}>Takım arkadaşın aranıyor</strong>
        <div style={{ marginTop: "36px", height: "62px", padding: "0 22px", display: "flex", alignItems: "center", justifyContent: "space-between", border: "1px solid #39413e", borderRadius: "999px" }}>
          <span style={{ color: "#8f9a97", fontSize: "18px" }}>Rank uyumu</span>
          <span style={{ color: "#b8f7e4", fontSize: "20px", fontWeight: 700 }}>Hazır</span>
        </div>
        <div style={{ marginTop: "14px", height: "62px", padding: "0 22px", display: "flex", alignItems: "center", justifyContent: "space-between", borderRadius: "999px", background: "#b8f7e4", color: "#0f2b23" }}>
          <span style={{ fontSize: "18px", fontWeight: 700 }}>Oyuncu ara</span>
          <span style={{ fontSize: "24px" }}>→</span>
        </div>
      </div>
    </div>,
    size,
  );
}
