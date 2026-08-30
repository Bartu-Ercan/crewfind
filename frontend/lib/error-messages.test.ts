import { describe, expect, it } from "vitest";
import { isEmailAlreadyRegisteredError, isRateLimitedError, rateLimitRetryAfter, readableError } from "./error-messages";

describe("rate limit errors", () => {
  it("maps structured rate-limit errors without exposing SQL details", () => {
    const error = {
      code: "RATE_LIMITED",
      message: "Çok fazla istek gönderildi.",
      details: { retryAfter: 17 },
    };

    expect(isRateLimitedError(error)).toBe(true);
    expect(rateLimitRetryAfter(error)).toBe(17);
    expect(readableError(error)).toBe("Çok fazla istek gönderildi. Kısa süre sonra tekrar dene.");
  });

  it("parses PostgREST JSON details and hides unknown database errors", () => {
    expect(rateLimitRetryAfter({
      code: "RATE_LIMITED",
      details: JSON.stringify({ retryAfter: 9 }),
    })).toBe(9);
    expect(rateLimitRetryAfter({ code: "RATE_LIMITED", details: "retryAfter=11" })).toBe(11);
    expect(readableError({ message: "relation private.secret does not exist" }))
      .toBe("İşlem tamamlanamadı. Tekrar dene.");
  });
});

describe("auth errors", () => {
  it("maps an existing email without exposing the provider response", () => {
    const error = {
      code: "email_exists",
      message: "A user with this email address has already been registered",
    };

    expect(isEmailAlreadyRegisteredError(error)).toBe(true);
    expect(readableError(error)).toBe("Bu e-posta zaten kayıtlı. Giriş yap veya parolanı yenile.");
  });
});
