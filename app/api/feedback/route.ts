import nodemailer from "nodemailer";
import { z } from "zod";
import { getSupabaseAdminClient } from "@/backend/supabase/server-admin";

export const runtime = "nodejs";

const feedbackSchema = z.object({
  kind: z.enum(["suggestion", "bug", "other"]),
  message: z.string().trim().min(10).max(2000),
  replyEmail: z.union([z.literal(""), z.string().trim().email().max(254)]),
  sourcePath: z.enum(["/valorant", "/league-of-legends", "/cs2"]),
  website: z.string().max(200).optional().default(""),
});

const kindLabels = {
  suggestion: "Öneri",
  bug: "Hata bildirimi",
  other: "Diğer",
} as const;

const noStoreHeaders = { "Cache-Control": "private, no-store" };

function json(body: unknown, status = 200, headers: HeadersInit = {}) {
  return Response.json(body, { status, headers: { ...noStoreHeaders, ...headers } });
}

function requestIp(request: Request) {
  const forwarded = request.headers.get("x-vercel-forwarded-for")
    ?? request.headers.get("x-forwarded-for")
    ?? request.headers.get("x-real-ip")
    ?? "unknown";
  return forwarded.split(",")[0]?.trim() || "unknown";
}

function smtpConfiguration() {
  const user = process.env.FEEDBACK_SMTP_USER?.trim();
  const password = process.env.FEEDBACK_SMTP_PASS;
  const to = process.env.FEEDBACK_TO_EMAIL?.trim() || user;
  if (!user || !password || !to) return null;

  const port = Number(process.env.FEEDBACK_SMTP_PORT || "465");
  return {
    host: process.env.FEEDBACK_SMTP_HOST?.trim() || "smtp.gmail.com",
    port,
    secure: port === 465,
    user,
    password,
    to,
    from: process.env.FEEDBACK_FROM_EMAIL?.trim() || `CrewFind <${user}>`,
  };
}

async function setDeliveryStatus(feedbackId: string, status: "sent" | "failed" | "not_configured") {
  try {
    await getSupabaseAdminClient().rpc("set_feedback_delivery_status", {
      p_feedback_id: feedbackId,
      p_status: status,
    });
  } catch {
    // Mesaj zaten saklandı; durum işaretleme hatası kullanıcıya tekrar göndertmemeli.
  }
}

export async function POST(request: Request) {
  const payload = feedbackSchema.safeParse(await request.json().catch(() => null));
  if (!payload.success) return json({ code: "INVALID_FEEDBACK" }, 400);

  // Botlar bu görünmez alanı doldurursa gerçek bir kayıt oluşturmadan aynı yanıtı ver.
  if (payload.data.website) return json({ received: true });

  try {
    const admin = getSupabaseAdminClient();
    const authorization = request.headers.get("authorization") ?? "";
    const accessToken = authorization.match(/^Bearer\s+(.+)$/i)?.[1];
    let userId: string | null = null;

    if (accessToken) {
      const { data } = await admin.auth.getUser(accessToken);
      userId = data.user?.id ?? null;
    }

    const { data: feedbackId, error } = await admin.rpc("submit_feedback", {
      p_kind: payload.data.kind,
      p_message: payload.data.message,
      p_reply_email: payload.data.replyEmail || null,
      p_source_path: payload.data.sourcePath,
      p_ip: requestIp(request),
      p_user_id: userId,
    });

    if (error || typeof feedbackId !== "string") {
      const rateLimited = error?.message.includes("RATE_LIMITED");
      const retryAfter = error?.message.match(/retryAfter=(\d+)/)?.[1] ?? "600";
      return json(
        { code: rateLimited ? "RATE_LIMITED" : "FEEDBACK_UNAVAILABLE" },
        rateLimited ? 429 : 503,
        rateLimited ? { "Retry-After": retryAfter } : {},
      );
    }

    const smtp = smtpConfiguration();
    if (!smtp) {
      await setDeliveryStatus(feedbackId, "not_configured");
      return json({ received: true, delivered: false }, 202);
    }

    try {
      const transporter = nodemailer.createTransport({
        host: smtp.host,
        port: smtp.port,
        secure: smtp.secure,
        auth: { user: smtp.user, pass: smtp.password },
        disableFileAccess: true,
        disableUrlAccess: true,
      });
      const replyLine = payload.data.replyEmail || "Belirtilmedi";
      await transporter.sendMail({
        from: smtp.from,
        to: smtp.to,
        replyTo: payload.data.replyEmail || undefined,
        subject: `[CrewFind Beta] ${kindLabels[payload.data.kind]}`,
        text: [
          kindLabels[payload.data.kind],
          `Sayfa: ${payload.data.sourcePath}`,
          `Yanıt adresi: ${replyLine}`,
          "",
          payload.data.message,
        ].join("\n"),
      });
      await setDeliveryStatus(feedbackId, "sent");
      return json({ received: true, delivered: true });
    } catch {
      await setDeliveryStatus(feedbackId, "failed");
      return json({ received: true, delivered: false }, 202);
    }
  } catch {
    return json({ code: "FEEDBACK_UNAVAILABLE" }, 503);
  }
}
