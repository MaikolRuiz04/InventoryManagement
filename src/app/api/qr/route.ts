// src/app/api/qr/route.ts
export const runtime = "nodejs";

import { NextRequest } from "next/server";
import QRCode from "qrcode";

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  const url = req.nextUrl.searchParams.get("url");
  const payload = url ?? (id ? `${process.env.NEXT_PUBLIC_BASE_URL}/item/${id}` : null);

  if (!payload) {
    return new Response("Missing id or url", { status: 400 });
  }

  // Generate crisp, printable SVG (no Buffer types involved)
  const svg = await QRCode.toString(payload, { type: "svg", margin: 1, width: 512 });

  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "max-age=31536000, immutable",
    },
  });
}
