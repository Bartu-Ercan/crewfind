# CrewFind - Proje Referans Dosyası

Bu dosya CrewFind'in tüm tasarım ve ürün kararlarının tek doğruluk kaynağıdır. Yeni karar alındıkça bu dosyayı güncelle.

## Marka

- İsim: CrewFind. Kararlı, değiştirilmeyecek.
- Konsept: Valorant ve ileride LoL/CS2 için oyuncu/takım bulma ve matchmaking platformu.

## Renk Sistemi - Sky Mint x Graphite

### Light Mode

- `--bg: #f5f9f7`
- `--surface: #ffffff`
- `--border: #e2ece8`
- `--text-primary: #16211d`
- `--text-secondary: #5c6b64`
- `--text-muted: #8a9690`
- `--accent: #0f6e56`
- `--accent-soft: #e6f7f1`
- `--success: #2f7d4f`

### Dark Mode

- `--bg: #15171b`
- `--surface: #1e2126`
- `--border: #2a2e34`
- `--text-primary: #eafff6`
- `--text-secondary: #8f9a97`
- `--text-muted: #6b7570`
- `--accent: #b8f7e4`
- `--on-accent: #0f2b23`
- `--success: #3ba55d`

### Glow

Yalnızca dark mode ve hero arkasında kullanılır:

```css
radial-gradient(
  ellipse at center,
  rgba(184, 247, 228, 0.16) 0%,
  rgba(184, 247, 228, 0.05) 45%,
  transparent 75%
)
```

Başka hiçbir elemanda glow kullanılmaz.

## Tipografi

- Başlıklar: Rajdhani, weight 700.
- Body, form ve buton: Hanken Grotesk, 400/600.
- Hero başlık: 26-28px.
- Açıklama: 13-14px.
- Form label: 10-11px.
- Buton ve input: 12-13px.

## Spacing ve Radius

- Skala: 4-8-12-16-24-32-48-64px.
- Input, buton ve segmented control: pill/rounded-full.
- Büyük yüzeyler: 16-20px radius.
- Shadow yok. Glow dışında derinlik border ve zemin farkıyla sağlanır.

## Tasarım Felsefesi

- Kutulanmamış yapı: kalın border yok; ayrım boşluk ve hafif zemin farkıyla sağlanır.
- Hero ve form grubu kompakt olmalı: 24-32px aralık.
- Büyük boşluk yalnızca grubun dışında kullanılmalı.
- Referans his: Gemini karşılama ekranı; davetkar ve akıcı.

## Rank Rozeti Sistemi

- Riot'ın rank ikonları veya rozetleri kullanılmaz ve taklit edilmez. Şekil-kademe eşleşmesi de taklit edilmez.
- Yalnızca Lucide `shield` ikonu ve tek şekil kullanılır. Kademeye göre yalnızca renk değişir.
- Rozet arka planı kademe renginin yüzde 20 opaklığıdır.

Kademe renkleri:

- Demir: `#8a8a8a`
- Bronz: `#a9702f`
- Gümüş: `#c0c4c8`
- Altın: `#d9a441`
- Platin: `#1f9e93`
- Elmas: `#9451d6`
- Ölümsüz: `#c41f2f`

## Bileşenler

### Riot ID Input

- Tek pill içinde iki alan bulunur.
- Solda serbest nickname bulunur.
- Sağda sabit `#` ve yalnızca tag numarası bulunur. Kullanıcı `#` yazmaz.

### Rank Seçici

- Rankın ve minimum rank için kullanılır.
- Üstte küçük etiket, altında rozet, değer ve chevron içeren pill buton bulunur.
- Panelde her kademe bir satırdır: rozet, isim ve 1/2/3 chip.
- İki panel aynı anda açık kalamaz.
- Dışarı tıklanınca panel kapanır.
- Maksimum rank seçici yoktur; yalnızca minimum rank vardır.

### Kaç Kişisiniz

- Rounded-full segmented control.
- Seçenekler 1/2/3/4.
- Seçili değer accent dolgulu ve `1 kişi` gibi açık metinlidir.

### Kaç Kişi Arıyorsunuz

- `Kaç Kişisiniz` kontrolüyle aynı ölçüde rounded-full segmented control kullanılır.
- Seçenekler her zaman 1/2/3/4 olarak görünür; kontrolün boyutu seçime göre değişmez.
- Varsayılan hedef mevcut grubu beş kişiye tamamlamaktır.
- Mevcut grupla birlikte beş kişiyi aşacak seçenekler yerinde kalır, soluk gösterilir ve tıklanamaz.
- Seçili değer accent dolgulu ve `1 kişi` gibi açık metinlidir.

### CTA Buton

- Tam genişlik, rounded-full ve accent dolgulu.
- Hover, disabled ve loading durumları tanımlıdır.

## Matchmaking Ekranı

- Kutusuz ve viewport ortasındadır.
- Dairesel ikon rozeti, durum etiketi ve süre/aranan/bölge istatistikleri düz dizilir.

## Lobi Davranışı

- Biri lobiden çıkınca diğerlerine anlık `X lobiden ayrıldı` bildirimi gösterilir.
- Lobi tamamen dağılmaz.
- Eksik kişi sayısı otomatik yeni filtre olur ve kalanlar eksik oyuncu arama moduna döner.

## Logo Mikro Animasyonu

- Logo `Crew` ve `Find` metinlerinden oluşur; biri her zaman pill badge ile vurgulanır.
- Idle durumda `Crew` vurguludur.
- `Oyuncu ara` butonuna basılınca vurgu 300-400ms ease-in-out ile `Find` üzerine kayar.
- Input değişikliği animasyonu tetiklemez.
- İptal veya lobiden çıkışta vurgu `Crew` üzerine döner.

## Canlı Kullanıcı Sayacı

- Hero altında tek satır gerçek veri gösterir: `Şu an X oyuncu arıyor`.
- Dekoratif değildir.

## Scrollbar

- Varsayılan tarayıcı scrollbar'ı gizlenir.
- Her yerde 4-6px özel ince scrollbar kullanılır.

## İkon Seti

- Yalnızca Lucide kullanılır. Karışık ikon kaynağı kullanılmaz.

## Multi-Game Mimarisi

- Path tabanlı ayrı route'lar: `/valorant`, `/league-of-legends`, `/cs2`.
- Query parametresi kullanılmaz.
- Navbar'da ikon, isim ve chevron içeren oyun seçici pill bulunur.
- Varsayılan oyun Valorant'tır.
- Her oyunun kendi rank rozeti seti ve kademe sayısı bulunur.
- Bölge/kuyruk seçici gerçek ve çalışan dropdown olur.

## Negatif Kısıtlar

- Emoji yok.
- Generic feature-grid kartları yok.
- Testimonial duvarı veya `trusted by` şeridi yok.
- Riot resmi görselleri yok.
- Dekoratif ve amaca hizmet etmeyen eleman yok.

## Yol Haritası - Sıradaki Adımlar

1. Route mimarisi: `/valorant`, `/league-of-legends`, `/cs2`.
2. Navbar oyun seçici: pill ve dropdown.
3. Bölge/kuyruk seçiciyi gerçek ve çalışır hale getirme.
4. Canlı kullanıcı sayacı.
5. Logo entegrasyonu ve mikro animasyon.
6. LoL ve CS2 rank rozeti setleri.
7. Dropdown click-outside davranışı.
8. Lobi eksilme ve otomatik yeniden arama mantığı.
9. SEO: route bazlı title/meta, OpenGraph, sitemap ve robots.
10. Güvenlik: rate limiting, Riot ID doğrulama ve env kontrolü.
11. Yük testi; kullanıcı sayısı arttıkça, düşük öncelik.

## Riot Developer Portal

- İleride resmi asset erişimi için `developer.riotgames.com` kaydı ve Personal/Production API key başvurusu gerekir.
- Production key onayından sonra Public Content Catalog üzerinden resmi rank ikonlarına erişilebilir.
- RSO entegrasyonu gerekir.
- Kendi MMR/rank hesaplama sistemi kurmak yasaktır. CrewFind rank bilgisini yalnızca filtre olarak kullanır.
