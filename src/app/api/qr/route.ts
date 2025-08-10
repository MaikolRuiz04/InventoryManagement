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

  // Generate as Node Buffer
  const buf = await QRCode.toBuffer(payload, { margin: 1, width: 512 });

  // Convert Buffer -> Uint8Array so Response(body) type is valid
  const body = new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);

  return new Response(body, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "max-age=31536000, immutable",
    },
  });
}
