import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  getUser: vi.fn(),
  sendMail: vi.fn(),
}));

vi.mock("@/backend/supabase/server-admin", () => ({
  getSupabaseAdminClient: () => ({
    rpc: mocks.rpc,
    auth: { getUser: mocks.getUser },
  }),
}));

vi.mock("nodemailer", () => ({
  default: {
    createTransport: () => ({ sendMail: mocks.sendMail }),
  },
}));

import { POST } from "./route";

const body = {
  kind: "suggestion",
  message: "Kayıtlı hesap seçicisi çok kullanışlı.",
  replyEmail: "oyuncu@example.com",
  sourcePath: "/valorant",
  website: "",
};

function request(payload: Record<string, unknown> = body) {
  return new Request("https://crewfind.vercel.app/api/feedback", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-vercel-forwarded-for": "203.0.113.7",
    },
    body: JSON.stringify(payload),
  });
}

describe("POST /api/feedback", () => {
  beforeEach(() => {
    mocks.rpc.mockReset();
    mocks.getUser.mockReset();
    mocks.sendMail.mockReset();
    mocks.rpc
      .mockResolvedValueOnce({ data: "00000000-0000-4000-8000-000000000001", error: null })
      .mockResolvedValueOnce({ data: null, error: null });
    mocks.sendMail.mockResolvedValue({ messageId: "message-id" });
  });

  afterEach(() => {
    delete process.env.FEEDBACK_SMTP_USER;
    delete process.env.FEEDBACK_SMTP_PASS;
    delete process.env.FEEDBACK_TO_EMAIL;
  });

  it("stores feedback before sending the notification email", async () => {
    process.env.FEEDBACK_SMTP_USER = "crewfind@example.com";
    process.env.FEEDBACK_SMTP_PASS = "app-password";
    process.env.FEEDBACK_TO_EMAIL = "owner@example.com";

    const response = await POST(request());

    expect(response.status).toBe(200);
    expect(mocks.rpc).toHaveBeenNthCalledWith(1, "submit_feedback", expect.objectContaining({
      p_ip: "203.0.113.7",
      p_message: body.message,
    }));
    expect(mocks.sendMail).toHaveBeenCalledOnce();
    expect(mocks.rpc).toHaveBeenNthCalledWith(2, "set_feedback_delivery_status", {
      p_feedback_id: "00000000-0000-4000-8000-000000000001",
      p_status: "sent",
    });
  });

  it("keeps the stored message when SMTP is not configured", async () => {
    const response = await POST(request());

    expect(response.status).toBe(202);
    expect(await response.json()).toEqual({ received: true, delivered: false });
    expect(mocks.rpc).toHaveBeenNthCalledWith(2, "set_feedback_delivery_status", expect.objectContaining({
      p_status: "not_configured",
    }));
  });

  it("returns a retry window when the database quota is reached", async () => {
    mocks.rpc.mockReset();
    mocks.rpc.mockResolvedValueOnce({
      data: null,
      error: { message: '{"code":"RATE_LIMITED","details":"retryAfter=42"}' },
    });

    const response = await POST(request());

    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("42");
    expect(mocks.sendMail).not.toHaveBeenCalled();
  });

  it("silently discards honeypot submissions", async () => {
    const response = await POST(request({ ...body, website: "https://bot.example" }));

    expect(response.status).toBe(200);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
});
