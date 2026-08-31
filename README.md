# CrewFind

Ürün, marka, tasarım kısıtları ve yol haritası için
[`docs/CREWFIND_PROJECT_CONTEXT.md`](docs/CREWFIND_PROJECT_CONTEXT.md) dosyasını tek doğruluk
kaynağı olarak kullanın.

VALORANT oyuncuları için ilan listesi kullanmadan çalışan takım tamamlama uygulaması:

`form -> arama -> 30 saniyelik onay -> özel lobi`

Riot ID, rank ve mevcut grup büyüklüğü kullanıcı beyanıdır. Riot API ve Riot Sign On kullanılmaz.

## Proje Yapısı

- `app/`: Next.js route ve global stil kabuğu.
- `frontend/`: Arayüz bileşenleri, client-side tipler, demo verisi ve UI yardımcıları.
- `backend/`: Supabase istemcisi ve eşleştirme/domain mantığı.
- `shared/`: Frontend ve backend tarafından paylaşılabilen validasyon ve rank verileri.
- `supabase/`: Veritabanı migration dosyaları.

## Yerelde Çalıştırma

```bash
npm install
npm run dev
```

Demo akışı yalnızca `NEXT_PUBLIC_DEMO_MODE=true` açıkça ayarlandığında çalışır. Supabase
değişkenleri eksikse uygulama production akışını başlatmaz ve yapılandırma hatası gösterir.

Aynı Wi-Fi ağındaki telefon veya başka bir bilgisayardan test etmek için:

```bash
npm run dev:lan
```

Ardından `http://192.168.2.106:3001` adresini açın. Yerel IP değişirse
`next.config.ts` içindeki `allowedDevOrigins` değerini yeni IP ile güncelleyin.

## Supabase Kurulumu

1. Supabase projesinde Anonymous Sign-Ins özelliğini açın.
2. `supabase/migrations/202607060001_initial.sql` migration dosyasını uygulayın.
3. `.env.example` dosyasını `.env.local` olarak kopyalayıp proje URL ve publishable anahtarını ekleyin.
4. `NEXT_PUBLIC_DEMO_MODE=false` değerini ayarlayın.
5. Migration zincirini eksiksiz uygulayın. Stale state ve rate-limit temizliği son migration
   tarafından Supabase Cron üzerinden zamanlanır.

Yerel geliştirmede `NEXT_PUBLIC_TURNSTILE_ENABLED=false` kullanılabilir. Production öncesinde
bu değer `true` yapılmalı, Cloudflare Turnstile site/secret anahtarları eklenmeli ve
Gizlilik ile Kullanım Koşulları sayfaları gerçek metinlerle yayınlanmalıdır.

## Komutlar

```bash
npm run dev
npm run test
npm run test:load
npm run build
```

`npm run test:load`, 250 karışık Valorant, LoL ve CS2 adayını oyun bağlamlarını
karıştırmadan 50 takıma ayıran uygulama benchmarkını çalıştırır. Gerçek Postgres testi
`supabase/tests/controlled_load.sql` dosyasındadır; bütün test verisini tek transaction
içinde oluşturur ve sonuçtan sonra `rollback` ile temizler.
