# CrewFind Kontrollü Yük Testi

## Kapsam

- 250 eşzamanlı arama adayı.
- 100 Valorant, 75 LoL Flex ve 75 CS2 Premier oyuncusu.
- 50 ayrı beş kişilik takım.
- Oyun, rank sistemi ve takım hedefi izolasyonu.
- Tekrarlanan oyuncu veya eşleşmemiş test kaydı bırakılmaması.

## Güvenli Çalıştırma

Uygulama benchmarkı:

```bash
npm run test:load
```

Gerçek Postgres testi `supabase/tests/controlled_load.sql` dosyasındadır. Test:

- başlamadan önce canlı kuyruk ve lobi durumunun boş olduğu doğrulanarak çalıştırılır;
- bütün veriyi tek transaction içinde toplu ekler;
- 30 saniyelik statement ve 2 saniyelik lock timeout kullanır;
- sonuçtan sonra `rollback` çalıştırır;
- test hesabı, kuyruk, teklif veya rate-limit kaydı bırakmaz.

Doğrudan bağlantı kullanılırken:

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/controlled_load.sql
```

`DATABASE_URL` yalnız yerel secret olarak tutulur; repoya veya terminal çıktısına yazılmaz.

## 31 Ağustos 2026 Sonucu

- Uygulama benchmarkı: 250 aday, 50 takım, 7 ms.
- Supabase Postgres: 250 aday, 50 teklif, 250 teklif kaydı, 93 ms.
- Paralel rate limit: 30 çağrının 20'si kabul, 10'u beklenen `RATE_LIMITED` yanıtı.
- Oyun veya rank sistemi karışması: 0.
- Eksik veya yinelenen oyuncu: 0.
- Kalıcı test verisi: 0.
- Veritabanı deadlock sayısı: 0.

Bu test kapasite garantisi değildir. Gerçek ağ gecikmesi, Turnstile, Auth, Realtime ve farklı coğrafyalardan istemci trafiği beta kalite turunda ayrıca izlenir.
