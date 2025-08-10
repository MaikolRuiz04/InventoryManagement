// src/app/api/qr/route.ts
export const runtime = "nodejs";

import { NextRequest } from "next/server";
import QRCode from "qrcode";

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  const url = req.nextUrl.searchParams.get("url");

  // Derive base from env OR current request (works on localhost, preview, prod)
  const proto = req.headers.get("x-forwarded-proto") ?? "https";
  const host = req.headers.get("host") ?? "";
  const fallbackBase = host ? `${proto}://${host}` : "";
  const base = process.env.NEXT_PUBLIC_BASE_URL || fallbackBase;

  const payload = url ?? (id && base ? `${base}/item/${id}` : null);
  if (!payload) return new Response("Missing id or url", { status: 400 });

  // SVG = vector, no Buffer typing pain
  const svg = await QRCode.toString(payload, { type: "svg", margin: 1, width: 512 });

  // Shortish cache so new domain / env changes propagate fast
  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600", // 1 hour
    },
  });
}
