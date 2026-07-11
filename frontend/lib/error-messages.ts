export function readableError(caught: unknown) {
  const message =
    caught instanceof Error
      ? caught.message
      : typeof caught === "object" &&
          caught !== null &&
          "message" in caught &&
          typeof caught.message === "string"
        ? caught.message
        : "";

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

  return message || "Havuza girilemedi.";
}
