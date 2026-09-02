const GOOGLE_SELLER_ID = "f08c47fec0942fa0";

export function GET() {
  const publisherId = process.env.ADSENSE_PUBLISHER_ID?.trim() ?? "";
  if (!/^pub-\d{10,20}$/.test(publisherId)) {
    return new Response("Ad seller is not configured.\n", {
      status: 404,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  return new Response(`google.com, ${publisherId}, DIRECT, ${GOOGLE_SELLER_ID}\n`, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
