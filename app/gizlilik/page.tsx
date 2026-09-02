import type { Metadata } from "next";
import Link from "next/link";
import { Brand } from "@/frontend/components/brand";
import { canonicalUrlFor } from "@/frontend/config/seo";

export const metadata: Metadata = {
  title: "Gizlilik Politikası",
  description: "CrewFind kullanıcı ve oyun hesabı verilerinin nasıl işlendiğini açıklar.",
  alternates: { canonical: canonicalUrlFor("/gizlilik") },
};

export default function PrivacyPage() {
  return <main className="legal-shell"><nav><Link href="/valorant"><Brand /></Link><Link href="/valorant">Ana sayfa</Link></nav><article><span className="step-kicker">SON GÜNCELLEME · 2 EYLÜL 2026</span><h1>Gizlilik Politikası</h1><p>CrewFind, takım arkadaşı eşleştirmek ve isteğe bağlı kalıcı hesap sağlamak için gereken en az veriyi işler.</p><h2>Toplanan veriler</h2><p>Hesap açarsan e-posta adresin, giriş sağlayıcın, CrewFind kullanıcı adın, avatar bağlantın ve kaydettiğin Riot ID’leri tutulabilir. Matchmaking sırasında oyun, rank, sunucu, kuyruk, roller, grup büyüklüğü, teklif, lobi ve sohbet verileri işlenir. Geri bildirim gönderirsen mesajın, seçtiğin tür, gönderdiğin sayfa ve isteğe bağlı yanıt e-postan saklanır.</p><h2>Misafir kullanımı</h2><p>Misafir oturumu Supabase üzerinde anonim bir kullanıcı kimliği kullanır. Tarayıcıya kaydettiğin Riot profilleri yalnız kendi cihazındaki yerel depolamada kalır; seçerek hesabına aktarmadıkça buluta gönderilmez.</p><h2>Hizmet sağlayıcıları</h2><p>Barındırma için Vercel, veritabanı ve kimlik doğrulama için Supabase, bot koruması için Cloudflare Turnstile kullanılır. Google, Discord veya ileride Riot ile giriş yaptığında ilgili sağlayıcı kendi politikalarına göre veri işler.</p><h2>Riot hesapları</h2><p>RSO onayı gelmeden kaydedilen Riot ID’leri kullanıcı beyanıdır ve hesap sahipliği doğrulanmış sayılmaz. RSO etkinleştiğinde doğrulama yalnız Riot’un resmi izin akışıyla yapılır.</p><h2>Saklama ve silme</h2><p>Kalıcı hesap verileri hesabını silene kadar tutulur. Süresi dolmuş eşleştirme durumu düzenli olarak temizlenir. Hesap silme özelliği bağlı profil ve kayıtlı oyun hesaplarını kaldırır; güvenlik ve geri bildirim kayıtları yasal veya operasyonel zorunluluk kadar sınırlı süre tutulabilir.</p><h2>İletişim</h2><p>Gizlilik talebi için hesap e-postalarının gönderildiği CrewFind iletişim adresini veya ana sayfadaki geri bildirim alanını kullanabilirsin. Genel lansmandan önce bu adres CrewFind alan adına taşınacaktır.</p><footer><Link href="/kullanim-kosullari">Kullanım Koşulları</Link></footer></article></main>;
}
