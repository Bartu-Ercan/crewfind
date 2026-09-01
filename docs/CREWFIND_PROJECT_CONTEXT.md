# CrewFind - Proje Referans Dosyası

Bu dosya CrewFind'in tüm tasarım ve ürün kararlarının tek doğruluk kaynağıdır. Yeni karar alındıkça bu dosyayı güncelle.

## Marka

- İsim: CrewFind. Kararlı, değiştirilmeyecek.
- Konsept: Valorant, LoL ve CS2 için canlı oyuncu/takım bulma ve matchmaking platformu.

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
- Sunucu istatistiğinde kuyruk türü tekrarlanmaz; yalnızca seçilen sunucu veya sunucu özeti gösterilir.
- Dairesel ikon rozetinin çevresinde ince, gölgesiz ve sürekli dönen bir arama halkası bulunur.
- Windows ve Chromium tarafında sistem hareket azaltma tercihi açık olsa da aramayı anlatan halka yavaş biçimde dönmeye devam eder; yalnız dekoratif iç nefes animasyonu kapanır.

## Turnstile Davranışı

- Turnstile yalnızca yeni anonim oturum gerektiğinde yüklenir; mevcut oturumu olan kullanıcıya gösterilmez.
- Cloudflare widget `Invisible` modundadır; kontrol arka planda çalışır ve kutu, spinner veya `Verify human` metni göstermez.
- Yeni oturum gerektiğinde doğrulama tokenı oluşmadan arama butonu aktif olmaz.
- Hesap modalında görünmez Turnstile yalnız e-posta kayıt, parola girişi veya parola sıfırlama alanıyla etkileşim kurulunca yüklenir; Google OAuth akışında kullanılmaz.

## Lobi Davranışı

- Biri lobiden çıkınca diğerlerine anlık `X lobiden ayrıldı` bildirimi gösterilir.
- Eski lobi kapanır; ayrılan oyuncunun araması iptal edilir.
- Kalan oyuncular mevcut sunucu, kuyruk, rank ve takım hedeflerini koruyarak otomatik yeniden aramaya döner.
- Kalan toplam oyuncu sayısı nedeniyle sistem yalnızca eksik kontenjanı tamamlayacak eşleşmeleri kabul eder.

## Sunucu ve Kuyruk Çoklu Seçimi

- Valorant sunucuları çoklu seçilebilir; en az bir sunucu her zaman seçili kalır.
- Rekabetçi ve Derecesiz kuyrukları birlikte seçilebilir; en az bir kuyruk her zaman seçili kalır.
- Seçim yapınca dropdown kapanmaz; dışarı tıklayınca veya tetikleyiciye yeniden basınca anında kapanır.
- Oyun ve sunucu/kuyruk panelleri mouse alanı terk edince kısa tolerans ve sade fade sonrasında kapanır.
- Mouse kapanma tamamlanmadan alana dönerse panel açık kalır; dokunmatik ve klavye davranışı değişmez.
- Eşleşen bütün grupların en az bir ortak sunucusu ve bir ortak kuyruk türü bulunmalıdır.

## Eşleşme Onayı

- Kullanıcı `Kabul et` dedikten sonra kendi durumu açıkça `Hazır` görünür.
- Onaylanan kabul kararı değiştirilemez; kabul ve ret butonları tekrar tıklanamaz.
- Sunucu aynı kullanıcıdan gelen yinelenen kabul veya ret çağrılarını etkisiz kabul eder.

## Logo Mikro Animasyonu

- Logo `Crew` ve `Find` metinlerinden oluşur; biri her zaman pill badge ile vurgulanır.
- Idle durumda `Crew` vurguludur.
- `Oyuncu ara` butonuna basılınca vurgu 300-400ms ease-in-out ile `Find` üzerine kayar.
- Input değişikliği animasyonu tetiklemez.
- İptal veya lobiden çıkışta vurgu `Crew` üzerine döner.

## Canlı Kullanıcı Sayacı

- Hero altında tek satır gerçek veri gösterir: `Şu an X oyuncu arıyor`.
- Dekoratif değildir.
- `searching` kayıtları ve süresi dolmamış pending teklifler temsil ettikleri `party_size` toplamıyla sayılır.
- Ana ekranda 15 saniyede bir güncellenir; veri alınamazsa sahte veya sıfır kabul edilen bir değer gösterilmez.

## Güvenlik Modeli

- Data API'ye açık RPC adları geriye uyumludur; public fonksiyonlar `SECURITY INVOKER` sarmalayıcıdır.
- Veri değiştiren ayrıcalıklı iş mantığı ve lobi üyelik yardımcısı Data API'ye kapalı `private` şemasındadır.
- Arama, durum, teklif, terk etme, mesaj ve global sayaç çağrıları sabit pencere kotalarıyla sınırlandırılır.
- Kotalar: arama 6/dakika ve 30/saat; durum 60/dakika; teklif 10/dakika; terk etme 10/dakika; mesaj 12/10 saniye ve 60/dakika; global sayaç IP başına 20/dakika.
- IP adresleri düz metin kaydedilmez; `pgcrypto` ve veritabanında tutulan özel salt ile hash'lenir.
- Kota yanıtı HTTP 429, güvenli `RATE_LIMITED` kodu ve `Retry-After` bilgisi taşır.
- Normal durum sorgusu 1,5 saniyede bir devam eder; kota alınırsa istemci belirtilen süre boyunca bekleyip otomatik sürdürür.
- Demo modu yalnızca `NEXT_PUBLIC_DEMO_MODE=true` ile açılır. Eksik production değişkenleri sahte moda düşmez.
- Turnstile secret yalnız Supabase Auth ayarında tutulur; istemciye yalnız site key ve Supabase publishable key verilir.

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
- Üç oyun tek, yapılandırılabilir uygulamayı kullanır; kuyruk kayıtları `game` ve `rank_system` ile kesin olarak ayrılır.
- Aktif arama, teklif veya lobi varken oyun ve filtre seçicileri değiştirilemez.
- Sayfa yenilenince `get_my_status()` oyun ve filtre bağlamını döndürür; kullanıcı doğru oyun route'una yönlendirilir.
- Canlı kullanıcı sayacı bütün oyunların temsil edilen toplam oyuncu sayısını gösterir.

### League of Legends

- Sunucu tekli seçimdir: Türkiye (`TR1`) veya EU West (`EUW1`); varsayılan Türkiye'dir.
- Sıra tekli seçimdir: Dereceli Solo/Duo veya Dereceli Flex.
- Solo/Duo araması daima `1 kişi + 1 takım arkadaşı` olarak çalışır; grup ve aranan kişi kontrolleri gösterilmez.
- Solo/Duo rol kontrolü tek seçimlidir; başka role basınca önceki seçim otomatik olarak değişir ve bütün roller her zaman tıklanabilir kalır.
- Flex'te grup büyüklüğü ve beş kişilik takım hedefi kontrolleri kullanılır.
- Demir-Elmas arasında IV/III/II/I; ardından Ustalık, Üstatlık ve Şampiyonluk kullanılır.
- Varsayılan rank Altın IV, minimum rank Gümüş IV'tür.
- Grup, dolu rollerini Üst/Orman/Orta/Alt/Destek arasından seçer; roller eklenip kaldırılabilir ve arama anında seçili rol sayısı grup büyüklüğüne eşit olmalıdır.
- Aynı role sahip iki grup aynı eşleşmeye alınmaz.
- Riot ID sahipliği bu aşamada doğrulanmaz. İsteğe bağlı LeagueOfGraphs profil sorgusu yalnızca hesabın herkese açık profilinin bulunup bulunamadığını ve harici rank/son maç özetini gösterir.
- Harici profil bilgisi eşleştirme kararını değiştirmez ve hiçbir yerde `doğrulanmış hesap` olarak sunulmaz.
- Profil sorguları yalnız sunucu tarafındaki Parse.bot anahtarıyla yapılır; servis sağlayıcının kendi kotasına ek olarak CrewFind kullanıcı kotası uygulanır ve sonuç bir saat önbelleğe alınır.
- Lobi kartı harici profili kullanıcı isterse açar. Kaynak kullanılamazsa mevcut kart ve matchmaking çalışmaya devam eder.

### Counter-Strike 2

- Steam görünen adı ile 5-12 haneli sayısal arkadaş kodu ayrı alanlardır. İkisinden yalnızca biri arama için yeterlidir; arkadaş kodu isteğe bağlıdır.
- Bağlantı bölgeleri Vienna, Frankfurt, Warsaw, Dubai, Amsterdam ve Stockholm'dür; çoklu seçilir, varsayılan Vienna'dır.
- Bağlantı bölgesi seçeneklerinde Türkiye'den yaklaşık ping aralığı bilgi amaçlı gösterilir; gerçek ping konum ve internet sağlayıcısına göre değişir.
- Premier ve Competitive tekli mod seçimidir.
- Premier altı seçilebilir CS Rating bandı kullanır: 1.000-4.999, 5.000-9.499, 9.500-12.999, 13.000-16.999, 17.000-19.499 ve 19.500+. Varsayılan 9.500-12.999, minimum 5.000-9.499'dur.
- Competitive, Silver I-Global Elite arasındaki 18 Skill Group'u kullanır.
- Competitive haritaları çoklu seçilir. Eşleşmedeki bütün kayıtların en az bir ortak haritası olmalıdır.
- Harita listesi: Ancient, Anubis, Cache, Dust II, Inferno, Mirage, Nuke, Overpass, Train, Vertigo, Office, Boulder, Fachwerk ve Shelter.
- Premier'da harita filtresi kullanılmaz.

### Ortak Matchmaking Kuralları

- Aynı oyun, rank sistemi, takım hedefi ve kuyruk zorunludur.
- Bütün grupta en az bir ortak sunucu veya bağlantı bölgesi bulunur.
- Rank aralığı bütün temsilciler arasında iki yönlü doğrulanır.
- `5 solo` ve `3+1+1` kompozisyonları Valorant, LoL Flex ve CS2'de toplam beş oyuncuyu temsil eder.
- Bir anonim hesap bütün oyunlarda aynı anda yalnızca bir aktif arama veya lobi taşıyabilir.
- Lobi bozulunca oyun, rank sistemi, roller, haritalar ve diğer filtreler korunarak otomatik arama sürer.
- Lobi kartı Riot oyunlarında Riot ID'yi, CS2'de varsa arkadaş kodunu, yoksa Steam adını kopyalar.

## Kalıcı Hesap ve Kayıtlı Riot Profilleri

- Misafir matchmaking ana akış olarak çalışmaya devam eder; giriş zorunlu değildir.
- Kalıcı hesaplarda Google ve doğrulanmış e-posta/parola girişleri kullanılır. Discord ve Riot girişleri ilgili onay ve kurulumlar tamamlanana kadar görünmez.
- Anonim kullanıcı yeni bir kimlik bağladığında aynı Supabase UUID'si korunur; aktif arama ve lobi kaybolmaz.
- Aktif arama, teklif veya lobi sırasında hesap değiştirme, çıkış ve kayıtlı oyun profili değiştirme engellenir.
- CrewFind kullanıcı adı 3-20 karakterdir; harf, sayı ve `_` kabul eder ve büyük/küçük harfe duyarsız benzersizdir.
- Kalıcı kullanıcı en fazla 10 Riot hesabı saklar. Her hesap VALORANT ve LoL için ayrı tam arama tercihi taşıyabilir.
- RSO öncesindeki Riot hesapları yalnız `Kullanıcı beyanı` olarak gösterilir; doğrulanmış rozeti kullanılmaz.
- VALORANT ve LoL Riot ID alanlarının sağ üstünde yalnız kayıt varsa görünen, alanın arkasından çıkan küçük `Kayıtlı hesaplar` sekmesi bulunur; CS2 bu sistemin dışında kalır.
- Kayıtlı hesap paneli inputun üstüne açılır. Son kullanılan hesap ilk sıradadır; seçim Riot ID ile tam arama tercihini forma yükler. Hesap ekleme ve silme yalnız `/hesabim` sayfasında yapılır.
- Riot ID elle değiştirilirse önceki kayıt seçimi temizlenir; kayıtlı hesap sessizce yeniden adlandırılmaz.
- Başarılı arama sonrasında kullanılan Riot ID ve tam arama tercihi otomatik kaydedilir. Başarısız arama kayıt oluşturmaz; kayıt hatası başlamış aramayı iptal etmez. Ayrı `Kaydet` kontrolü kullanılmaz.
- Misafir kayıtları versionlanmış localStorage verisidir; kalıcı hesaba geçişte yalnız kullanıcının seçtikleri buluta aktarılır.
- Giriş ve hesap oluşturma akışı navbar popoverı değil, ortalanmış ve erişilebilir bir modaldır. Google ve e-posta/parola seçenekleri CrewFind tasarım diliyle gösterilir; Discord ve Riot girişleri hazır olana kadar gizlidir.
- Parola sınırı 8-72 karakterdir. Sözleşme kabulü kullanıcı tarafından açıkça verilmeden kaydedilmez.
- Production adresi `https://crewfind.vercel.app` olarak kullanılır. Eski `crewfind-tr.vercel.app` adresi kalıcı yönlendirmedir.
- Gizlilik ve kullanım koşulları sürümlüdür. E-posta ile hesap oluştururken açık onay kutusu zorunludur. Google butonunun altındaki kısa bilgilendirme, Google akışını başlatan tıklamanın kabul anlamına geldiğini açıklar; kabul yalnız başarılı OAuth dönüşünden sonra kalıcı profilde saklanır.
- Beta e-postaları custom Gmail SMTP üzerinden gönderilir ve gönderen kişisel Gmail adresidir. CrewFind adına ait doğrulanmış özel alan adı alınmadan gönderen adresi değiştirilmeyecek; genel lansmandan önce alan adı tabanlı transactional e-posta sağlayıcısına geçilecektir.
- Doğrulama e-postası CrewFind mint/grafit dilinde, büyük tek eylem düğmesi ve düz bağlantı yedeği kullanır. Auth callback yalnız bir kez işlenir; PKCE kodu tüketilmeden başarılı sayılmaz. Anonim e-posta yükseltmesinde `needs_password` kullanıcı metadata işareti parola oluşturulana kadar korunur; modal yalnız tarayıcı deposuna bağlı kalmadan yeniden açılır. Misafir profil aktarımı parola oluşturma tamamlanana kadar gösterilmez.

## Negatif Kısıtlar

- Emoji yok.
- Generic feature-grid kartları yok.
- Testimonial duvarı veya `trusted by` şeridi yok.
- Riot resmi görselleri yok.
- Dekoratif ve amaca hizmet etmeyen eleman yok.

## Yol Haritası - Sıradaki Adımlar

1. Tamamlandı: Route mimarisi: `/valorant`, `/league-of-legends`, `/cs2`.
2. Tamamlandı: Navbar oyun seçici: pill ve dropdown.
3. Tamamlandı: Oyunlara özel bölge/kuyruk seçiciler.
4. Tamamlandı: Canlı kullanıcı sayacı.
5. Tamamlandı: Logo entegrasyonu ve mikro animasyon.
6. Tamamlandı: LoL ve CS2 rank sistemleri ve canlı matchmaking.
7. Tamamlandı: Dropdown click-outside ve mouse-leave davranışı.
8. Tamamlandı: Lobi eksilme ve bağlamı koruyan otomatik yeniden arama.
9. Tamamlandı: Route bazlı title/meta, OpenGraph, JSON-LD, sitemap ve robots.
10. Tamamlandı: Güvenlik sertleştirmesi; rate limiting, ayrıcalıklı fonksiyon izolasyonu, güvenli hata yönetimi, Riot/Steam kimlik doğrulama stratejisi ve env denetimi.
11. Tamamlandı: LoL için hata toleranslı, isteğe bağlı LeagueOfGraphs profil özeti.
12. Tamamlandı: Ortalanmış giriş modalı, otomatik Riot profil kaydı ve küçük yukarı açılan hesap seçici uygulandı; Google OAuth ve beta Gmail SMTP canlıdır, Discord ve Riot girişleri ertelenmiştir.
13. Tamamlandı: 250 aktif aday ölçeğinde uygulama benchmarkı, rollback kullanan gerçek Postgres testi ve 30 paralel rate-limit çağrısı çalıştırıldı; oyun izolasyonu, 50 tam takım, atomik kota ve kalıcı test verisi bırakılmaması doğrulandı.
14. Devam ediyor: 390x844 mobil ve 1440x900 masaüstü tarayıcı matrisi, açık/koyu tema, yatay taşma ve giriş modalı erişilebilirlik testleri tamamlandı. Google girişinde checkbox kaldırıldı ve başarılı OAuth dönüşüne bağlı sözleşme kaydı eklendi. Kalan iş doğrulanmış özel alan adıyla dış e-posta teslimatı ve production Google dönüşünün son kabul testidir.

## Riot Developer Portal

- İleride resmi asset erişimi için `developer.riotgames.com` kaydı ve Personal/Production API key başvurusu gerekir.
- Production key onayından sonra Public Content Catalog üzerinden resmi rank ikonlarına erişilebilir.
- RSO entegrasyonu gerekir.
- API Evangelist Riot Games deposu yalnızca API tanım arşividir; kullanıcı sahipliği doğrulaması sağlamaz. Canlı doğrulama yalnız onaylı Production uygulaması ve RSO ile eklenir.
- Kendi MMR/rank hesaplama sistemi kurmak yasaktır. CrewFind rank bilgisini yalnızca filtre olarak kullanır.
