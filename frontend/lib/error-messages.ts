type ErrorLike = {
  code?: unknown;
  message?: unknown;
  details?: unknown;
};

function errorLike(caught: unknown): ErrorLike {
  return typeof caught === "object" && caught !== null ? caught : {};
}

export function rateLimitRetryAfter(caught: unknown) {
  const error = errorLike(caught);
  const sources = [error.details, error.message];

  for (const source of sources) {
    if (typeof source === "object" && source !== null && "retryAfter" in source) {
      const seconds = Number(source.retryAfter);
      if (Number.isFinite(seconds) && seconds > 0) return Math.ceil(seconds);
    }
    if (typeof source !== "string") continue;
    try {
      const parsed = JSON.parse(source) as { retryAfter?: unknown; details?: { retryAfter?: unknown } };
      const seconds = Number(parsed.retryAfter ?? parsed.details?.retryAfter);
      if (Number.isFinite(seconds) && seconds > 0) return Math.ceil(seconds);
    } catch {
      const match = source.match(/retryAfter[^0-9]*(\d+)/i);
      if (match) return Math.max(1, Number(match[1]));
    }
  }

  return 60;
}

export function isRateLimitedError(caught: unknown) {
  const error = errorLike(caught);
  return error.code === "RATE_LIMITED" ||
    (typeof error.message === "string" && error.message.includes("RATE_LIMITED"));
}

export function isEmailAlreadyRegisteredError(caught: unknown) {
  const error = errorLike(caught);
  const code = typeof error.code === "string" ? error.code.toLowerCase() : "";
  const message = typeof error.message === "string" ? error.message.toLowerCase() : "";

  return code === "email_exists" ||
    code === "email_address_already_exists" ||
    message.includes("email address has already been registered") ||
    message.includes("email already registered");
}

export function readableError(caught: unknown) {
  const error = errorLike(caught);
  const message =
    caught instanceof Error
      ? caught.message
      : typeof error.message === "string"
        ? error.message
        : "";

  if (isRateLimitedError(caught)) {
    return "Çok fazla istek gönderildi. Kısa süre sonra tekrar dene.";
  }

  if (message === "MATCHMAKING_PAUSED") return "Yeni aramalar bakım nedeniyle kısa süreliğine durduruldu. Mevcut lobiler devam ediyor.";
  if (message === "ACCOUNT_RESTRICTED") return "Bu hesabın arama ve sohbet erişimi geçici olarak kısıtlandı.";

  if (isEmailAlreadyRegisteredError(caught)) {
    return "Bu e-posta zaten kayıtlı. Giriş yap veya parolanı yenile.";
  }

  if (
    message.includes("enqueue_and_attempt_match") ||
    message.includes("Could not find the function")
  ) {
    return "Supabase kurulumu eksik: CrewFind migration dosyasını SQL Editor'da çalıştır.";
  }

  if (message.toLowerCase().includes("captcha") || message.includes("captcha_token")) {
    return "Turnstile doğrulaması eksik. Vercel site key ve Supabase secret key ayarlarını kontrol et.";
  }

  if (message.includes("one_active_queue_per_player")) {
    return "Eski kuyruk kaydı yeni aramayı engelliyor. Supabase queue index onarım migration'ını çalıştır.";
  }

  const safeMessages = [
    "Oturum gerekli",
    "Geçersiz grup bilgileri",
    "Sunucu ve kuyruk gerekli",
    "Geçersiz oyuncu adı",
    "Geçersiz VALORANT arama bilgileri",
    "Geçersiz LoL arama bilgileri",
    "Geçersiz CS2 arkadaş kodu",
    "Geçersiz CS2 arama bilgileri",
    "Geçersiz Premier arama bilgileri",
    "Geçersiz Competitive arama bilgileri",
    "Geçersiz CS2 rank sistemi",
    "Geçersiz oyun",
    "Zaten aktif bir lobidesin",
    "Bu eşleşmenin katılımcısı değilsin",
    "Geçersiz mesaj",
    "Bu lobinin üyesi değilsin",
    "Güvenlik doğrulamasını tamamla.",
    "Güvenlik kontrolü hazırlanıyor. Bir saniye sonra tekrar dene.",
    "Supabase çevre değişkenleri eksik.",
  ];

  return safeMessages.find((safeMessage) => message.includes(safeMessage)) ?? "İşlem tamamlanamadı. Tekrar dene.";
}
