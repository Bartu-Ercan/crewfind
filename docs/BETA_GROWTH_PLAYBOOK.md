# CrewFind Beta Büyüme Planı

## Hedef

İlk likidite odağı VALORANT Türkiye ve 19.00-01.00 saat aralığıdır. Ana ölçüt kayıt sayısı değil, haftalık başarıyla tamamlanan takım sayısıdır.

## Ücretsiz Dağıtım Sırası

1. Her gün aynı iki saatlik aralıkta ürünü gerçek kullanıcılarla çalıştır.
2. Üniversite e-spor kulüpleri, internet kafe toplulukları ve VALORANT topluluk yöneticilerinden tek beta/geri bildirim gönderisi için izin iste.
3. Küçük yayıncılara hazır reklam metni göndermek yerine üründe canlı takım bulma denemesi öner.
4. Eşleşme deneyimini 15-30 saniyelik özgün dikey videolarla göster. Kullanıcı adı ve sohbet gibi kişisel verileri gizle.
5. Toplu DM, aynı metni tekrar tekrar gönderme, sahte kullanıcı veya satın alınmış etkileşim kullanma.

## Hazır Metinler

### Moderatör izni

> Selam, Türkiye sunucusunda rank ve takım büyüklüğüne göre eksik oyuncu eşleştiren CrewFind adlı ücretsiz bir beta geliştiriyorum. Topluluğunuzda tek bir geri bildirim gönderisi paylaşmam uygun olur mu? Link spam yapmayacağım; sorun veya kaldırma talebinde hemen müdahale edeceğim.

### VALORANT topluluk gönderisi

> Beşinci oyuncuyu ararken farklı kanallarda tek tek yazmak yerine rank, İstanbul/Frankfurt sunucusu ve takım büyüklüğünü seçerek eşleşebileceğiniz ücretsiz CrewFind betasını açtım. İlk kullanıcılarla hataları topluyorum. Deneyenlerin özellikle eşleşme süresi ve filtreler hakkındaki geri bildirimi değerli: https://crewfind.vercel.app/valorant?utm_source=community&utm_medium=organic&utm_campaign=beta_launch

### Oyun içi kısa paylaşım

> 5. oyuncu için CrewFind beta: crewfind.vercel.app/valorant

### Yayıncı mesajı

> Yayında bir kez gerçek takım araması deneyip nerede takıldığını açıkça göstermen yeterli. Ücretli veya ezber reklam istemiyorum; çalışmayan yeri de söyleyebilirsin. Ölçülebilir bağlantı: https://crewfind.vercel.app/valorant?utm_source=creator&utm_medium=organic&utm_campaign=beta_launch

## Reklam Açılış Kontrolü

- AdSense site ve publisher onayı tamamlandı.
- Google onaylı CMP etkin ve reklam etiketi rıza öncesinde çağrılmıyor.
- `NEXT_PUBLIC_ADSENSE_CLIENT`, `NEXT_PUBLIC_ADSENSE_DESKTOP_SLOT` ve `ADSENSE_PUBLISHER_ID` doğru.
- Production'da `/ads.txt` doğru publisher satırını döndürüyor.
- Yalnız tek masaüstü sticky rail görünür; teklif, lobi, sohbet, mobil ve tablette reklam yok.
- 1440x900 ve 1920x1080 ekranlarda CTA, menü, scrollbar ve reklam arasında yeterli mesafe var.
- CLS p75, arama başlatma oranı ve eşleşme tamamlama oranı reklam öncesi değerlerle karşılaştırılıyor.
