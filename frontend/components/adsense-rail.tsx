"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";

type AdSenseWindow = Window & {
  adsbygoogle?: Array<Record<string, never>>;
};

type AdRailSide = "left" | "right";

const AD_RAIL_SIDE_STORAGE_KEY = "crewfind-ad-rail-side";
const DESKTOP_AD_RAIL_MEDIA_QUERY = "(min-width: 1440px) and (min-height: 720px)";

function getSessionAdRailSide(): AdRailSide {
  try {
    const storedSide = window.sessionStorage.getItem(AD_RAIL_SIDE_STORAGE_KEY);
    if (storedSide === "left" || storedSide === "right") return storedSide;

    const randomValue = new Uint8Array(1);
    window.crypto.getRandomValues(randomValue);
    const side: AdRailSide = randomValue[0] % 2 === 0 ? "left" : "right";
    window.sessionStorage.setItem(AD_RAIL_SIDE_STORAGE_KEY, side);
    return side;
  } catch {
    return "right";
  }
}

function adsenseConfiguration() {
  const enabled = process.env.NEXT_PUBLIC_ADSENSE_ENABLED === "true";
  const consentReady = process.env.NEXT_PUBLIC_ADSENSE_CONSENT_READY === "true";
  const client = process.env.NEXT_PUBLIC_ADSENSE_CLIENT?.trim() ?? "";
  const slot = process.env.NEXT_PUBLIC_ADSENSE_DESKTOP_SLOT?.trim() ?? "";

  if (!enabled || !consentReady || !/^ca-pub-\d{10,20}$/.test(client) || !/^\d{6,20}$/.test(slot)) {
    return null;
  }

  return { client, slot };
}

export function AdSenseRail({ active }: { active: boolean }) {
  const unitRef = useRef<HTMLModElement>(null);
  const [desktopViewport, setDesktopViewport] = useState(false);
  const [side, setSide] = useState<AdRailSide | null>(null);
  const configuration = adsenseConfiguration();
  const client = configuration?.client;
  const slot = configuration?.slot;

  useEffect(() => {
    if (typeof window.matchMedia !== "function") {
      setDesktopViewport(true);
      return;
    }

    const mediaQuery = window.matchMedia(DESKTOP_AD_RAIL_MEDIA_QUERY);
    const updateViewport = () => setDesktopViewport(mediaQuery.matches);
    updateViewport();
    mediaQuery.addEventListener("change", updateViewport);
    return () => mediaQuery.removeEventListener("change", updateViewport);
  }, []);

  useEffect(() => {
    if (!active || !client || !desktopViewport || !slot) {
      setSide(null);
      return;
    }

    setSide(getSessionAdRailSide());
  }, [active, client, desktopViewport, slot]);

  useEffect(() => {
    const unit = unitRef.current;
    if (!active || !client || !slot || !side || !unit || unit.dataset.crewfindAdRequested === "true") return;

    unit.dataset.crewfindAdRequested = "true";
    const target = window as AdSenseWindow;
    target.adsbygoogle = target.adsbygoogle ?? [];
    target.adsbygoogle.push({});
  }, [active, client, side, slot]);

  if (!active || !configuration || !desktopViewport || !side) return null;

  return (
    <>
      <Script
        id="crewfind-adsense"
        src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${configuration.client}`}
        strategy="lazyOnload"
        crossOrigin="anonymous"
      />
      <aside className="adsense-rail" data-side={side} aria-label="Reklam">
        <span>REKLAM</span>
        <ins
          ref={unitRef}
          className="adsbygoogle"
          data-ad-client={configuration.client}
          data-ad-slot={configuration.slot}
        />
      </aside>
    </>
  );
}
