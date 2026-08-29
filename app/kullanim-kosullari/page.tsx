import type { Metadata } from "next";
import Link from "next/link";
import { Brand } from "@/frontend/components/brand";
import { canonicalUrlFor } from "@/frontend/config/seo";

export const metadata: Metadata = {
  title: "Kullanım Koşulları",
  description: "CrewFind hizmetinin kullanım kurallarını açıklar.",
  alternates: { canonical: canonicalUrlFor("/kullanim-kosullari") },
};

export default function TermsPage() {
  return <main className="legal-shell"><nav><Link href="/valorant"><Brand /></Link><Link href="/valorant">Ana sayfa</Link></nav><article><span className="step-kicker">SÜRÜM · 29 AĞUSTOS 2026</span><h1>Kullanım Koşulları</h1><p>CrewFind’i kullanarak bu koşulları ve Gizlilik Politikası’nı kabul edersin.</p><h2>Hizmet</h2><p>CrewFind, oyuncuların beyan ettiği oyun bilgilerine göre takım arkadaşı bulmasına yardımcı olur. Eşleşme, oyuncunun davranışı, rankı veya hesap sahipliği için garanti vermez.</p><h2>Kullanıcı sorumluluğu</h2><p>Doğru bilgi vermeli, başka kişileri taklit etmemeli, spam, taciz, tehdit, hile, dolandırıcılık veya yetkisiz otomasyon yapmamalısın. Riot ID ve diğer oyun bilgilerini paylaşma yetkin bulunmalıdır.</p><h2>Hesap güvenliği</h2><p>Giriş yöntemlerini ve parolanı korumak kullanıcının sorumluluğundadır. Şüpheli erişimde parolanı değiştirip bağlı sağlayıcılarını kontrol etmelisin.</p><h2>İçerik ve yaptırım</h2><p>Sohbet mesajlarından kullanıcı sorumludur. Güvenliği veya hizmet bütünlüğünü ihlal eden hesaplar sınırlandırılabilir veya silinebilir.</p><h2>Üçüncü taraflar</h2><p>CrewFind; Riot Games, Valve, Google veya Discord tarafından desteklenen ya da onaylanan resmi bir ürün değildir. İlgili markalar sahiplerine aittir. Üçüncü taraf hizmetleri kendi koşullarına tabidir.</p><h2>Değişiklik ve erişilebilirlik</h2><p>Beta döneminde özellikler değişebilir veya geçici olarak durabilir. Önemli koşul değişikliklerinde yeni sürüm açıkça gösterilir ve yeniden kabul istenebilir.</p><footer><Link href="/gizlilik">Gizlilik Politikası</Link></footer></article></main>;
}
