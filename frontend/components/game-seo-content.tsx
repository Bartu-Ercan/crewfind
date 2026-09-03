import Link from "next/link";
import { GAME_ROUTES, type GameId } from "@/shared/game-config";

type SeoContent = {
  kicker: string;
  heading: string;
  intro: string;
  details: Array<{ title: string; body: string }>;
};

const content: Record<GameId, SeoContent> = {
  valorant: {
    kicker: "VALORANT EŞLEŞTİRME REHBERİ",
    heading: "VALORANT'ta 5. oyuncuyu nasıl bulursun?",
    intro: "CrewFind, solo oyuncularla eksiğini tamamlamak isteyen grupları aynı takım hedefinde buluşturur. Riot ID'ni ve gerçek oyun tercihlerini girmen yeterlidir.",
    details: [
      { title: "Takım hedefini belirle", body: "Solo giriyorsan dört oyuncu, üç kişilik grubun varsa iki oyuncu arayabilirsin. Sistem toplamı beş kişiye tamamlayan grupları birlikte değerlendirir." },
      { title: "Ortak filtrelerle eşleş", body: "Rank ve minimum rank aralığı iki yönlü kontrol edilir. İstanbul, Frankfurt ve diğer seçili sunucularla Rekabetçi veya Derecesiz tercihlerinde en az bir ortak değer gerekir." },
      { title: "Hazır takımına geç", body: "Eşleşen herkes süre içinde kabul ettiğinde özel lobi açılır. Riot ID'lerini kopyalayıp oyuncuları oyunda ekleyebilirsin." },
    ],
  },
  "league-of-legends": {
    kicker: "LOL EŞLEŞTİRME REHBERİ",
    heading: "LoL Solo/Duo veya Flex takım arkadaşını bul",
    intro: "CrewFind, League of Legends oyuncularını sunucu, sıra, rank ve takım rolüne göre eşleştirir. TR1 ve EUW1 kuyrukları birbirinden ayrı kalır.",
    details: [
      { title: "Solo/Duo için rolünü seç", body: "Tek başına ararken ana rolünü seçersin ve sistem aynı sunucu ile rank aralığında bir takım arkadaşı arar." },
      { title: "Flex grubunu tamamla", body: "Grubundaki oyuncu sayısını ve dolu rolleri belirtirsin. Eşleşmede roller çakışmaz; toplam takım hedefi beş oyuncuya tamamlanır." },
      { title: "Tek onayla lobiye geç", body: "Uygun grup bulunduğunda bütün temsilciler eşleşmeyi onaylar. Ardından Riot ID'leri ve takım sohbeti aynı lobide açılır." },
    ],
  },
  cs2: {
    kicker: "CS2 EŞLEŞTİRME REHBERİ",
    heading: "CS2 Premier veya Competitive takımını tamamla",
    intro: "CrewFind, CS2 takım arkadaşı arayan oyuncuları mod, bağlantı bölgesi, rank aralığı ve gerektiğinde ortak haritaya göre bir araya getirir.",
    details: [
      { title: "Premier ratingini eşleştir", body: "CS Rating bandını ve kabul ettiğin minimum bandı seçersin. Yalnız iki yönlü uyumlu rating aralıkları aynı takım için değerlendirilir." },
      { title: "Uygun bağlantı bölgesini bul", body: "Vienna, Frankfurt, Warsaw ve diğer bölgeleri birlikte seçebilirsin. Türkiye'den yaklaşık ping bilgisi, düşük gecikmeli seçeneği belirlemene yardım eder." },
      { title: "Competitive haritasında buluş", body: "Competitive modunda oyuncuların en az bir ortak haritası bulunur. Eşleşme kabul edilince Steam adı veya arkadaş kodu lobide paylaşılır." },
    ],
  },
};

const gameLinks: Array<{ game: GameId; label: string }> = [
  { game: "valorant", label: "VALORANT takım arkadaşı bul" },
  { game: "league-of-legends", label: "LoL duo ve takım arkadaşı bul" },
  { game: "cs2", label: "CS2 takım arkadaşı bul" },
];

export function GameSeoContent({ game }: { game: GameId }) {
  const value = content[game];

  return (
    <section className="search-intent-section" aria-labelledby={`${game}-guide-title`}>
      <div className="search-intent-inner">
        <header className="search-intent-heading">
          <span>{value.kicker}</span>
          <h2 id={`${game}-guide-title`}>{value.heading}</h2>
          <p>{value.intro}</p>
        </header>
        <div className="search-intent-details">
          {value.details.map((detail, index) => (
            <article key={detail.title}>
              <span aria-hidden="true">0{index + 1}</span>
              <div>
                <h3>{detail.title}</h3>
                <p>{detail.body}</p>
              </div>
            </article>
          ))}
        </div>
        <nav className="search-intent-nav" aria-label="Oyunlara göre takım arkadaşı bul">
          {gameLinks.map((link) => (
            <Link key={link.game} href={GAME_ROUTES[link.game]} aria-current={link.game === game ? "page" : undefined}>
              {link.label}
            </Link>
          ))}
        </nav>
        <footer className="search-intent-footer">
          <span>CrewFind bağımsız bir beta ürünüdür.</span>
          <div><Link href="/gizlilik">Gizlilik</Link><Link href="/kullanim-kosullari">Kullanım Koşulları</Link></div>
        </footer>
      </div>
    </section>
  );
}
