# CrewFind Kimlik Doğrulama Stratejisi

Bu belge ileride uygulanacak Riot ve Steam hesap sahipliği doğrulamasının güvenlik sınırlarını tanımlar. Mevcut sürümde kullanıcı adları yalnız biçimsel olarak doğrulanır ve kullanıcı beyanıdır.

## Riot Games

- Hesap sahipliği doğrulaması yalnız Riot tarafından onaylanmış production uygulaması ve Riot Sign On (RSO) ile yapılır.
- OAuth yetkilendirme kodu sunucu tarafında değiştirilir; client secret tarayıcıya, Vercel public env alanlarına veya Supabase istemcisine verilmez.
- Başarılı RSO oturumundan sonra Riot Account API üzerinden oturum sahibinin hesabı alınır ve CrewFind anonim kullanıcısıyla sunucu tarafında bağlanır.
- Erişim ve yenileme tokenları yalnız gerekli süre boyunca şifreli sunucu depolamasında tutulur; loglara veya analitik olaylara yazılmaz.
- API Evangelist deposu, üçüncü taraf oyuncu sorgu servisleri veya kullanıcı adı varlığına dayalı kontroller hesap sahipliği kanıtı olarak kullanılmaz.
- Riot production/RSO onayı olmadan doğrulanmış rozeti veya doğrulama iddiası gösterilmez.
- LeagueOfGraphs üzerinden alınan isteğe bağlı LoL profil özeti yalnız herkese açık hesap/rank bilgisi olarak etiketlenir; eşleştirme yetkisi veya sahiplik doğrulaması sağlamaz.

## Steam

- Hesap sahipliği Steam OpenID 2.0 oturumu ile doğrulanır. Dönen kimlik URL'sindeki SteamID, sunucu tarafında doğrulanmış OpenID cevabından çıkarılır.
- Steam Web API anahtarı gerekirse yalnız server-side profil eşlemesi için kullanılır; tarayıcıya veya `NEXT_PUBLIC_` değişkenlerine konmaz.
- Görünen ad ve arkadaş kodu tek başına sahiplik kanıtı sayılmaz.
- SteamID bağlantısı kullanıcının açık işlemiyle kurulur ve kaldırılabilir olmalıdır.

## Uygulama Sırası

1. Riot production uygulaması ve RSO onayı alınır.
2. Steam OpenID dönüş ve CSRF/state korumalı oturum uçları tasarlanır.
3. Sağlayıcı kimlikleri ayrı private tabloda kullanıcı UUID'sine bağlanır.
4. Token şifreleme, rotasyon, silme ve denetim kayıtları tamamlanır.
5. Staging güvenlik testlerinden sonra doğrulanmış durum arayüzde gösterilir.

Bu koşullar sağlanmadan üçüncü taraf API ile sahte doğrulama yapılmaz.
