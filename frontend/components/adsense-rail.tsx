"use client";

import Script from "next/script";
import { useEffect, useRef } from "react";

type AdSenseWindow = Window & {
  adsbygoogle?: Array<Record<string, never>>;
};

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
  const configuration = adsenseConfiguration();
  const client = configuration?.client;
  const slot = configuration?.slot;

  useEffect(() => {
    const unit = unitRef.current;
    if (!active || !client || !slot || !unit || unit.dataset.crewfindAdRequested === "true") return;

    unit.dataset.crewfindAdRequested = "true";
    const target = window as AdSenseWindow;
    target.adsbygoogle = target.adsbygoogle ?? [];
    target.adsbygoogle.push({});
  }, [active, client, slot]);

  if (!active || !configuration) return null;

  return (
    <>
      <Script
        id="crewfind-adsense"
        src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${configuration.client}`}
        strategy="lazyOnload"
        crossOrigin="anonymous"
      />
      <aside className="adsense-rail" aria-label="Reklam">
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
