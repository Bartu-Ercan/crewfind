import Link from "next/link";
import { Brand } from "@/frontend/components/brand";

type GameComingSoonProps = {
  gameName: string;
};

export function GameComingSoon({ gameName }: GameComingSoonProps) {
  return (
    <main className="app-shell">
      <header className="topbar">
        <Brand />
      </header>
      <section className="home-section">
        <div className="hero-copy">
          <span className="eyebrow">Yakında</span>
          <h1>{gameName} hazırlanıyor.</h1>
          <p>
            Bu oyunun eşleştirme altyapısı ve rank sistemi sonraki yol haritası
            adımlarında açılacak.
          </p>
          <Link className="ghost-button" href="/valorant">
            VALORANT’a dön
          </Link>
        </div>
      </section>
    </main>
  );
}
