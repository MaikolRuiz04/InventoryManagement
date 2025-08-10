// src/app/api/label/route.ts
export const runtime = "nodejs";

import { NextRequest } from "next/server";
import QRCode from "qrcode";

function escapeXML(s: string) {
  return s.replace(/[&<>"']/g, (ch) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" } as const)[ch]!
  );
}

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  const name = req.nextUrl.searchParams.get("name") ?? "";
  const print = req.nextUrl.searchParams.get("print") === "1";
  if (!id) return new Response("Missing id", { status: 400 });

  // If PUBLIC_QR_BASE is set, always use it for QR destination.
  // Otherwise, fall back to the current request host (works locally).
  const configuredBase = process.env.PUBLIC_QR_BASE?.trim();
  const proto = req.headers.get("x-forwarded-proto") ?? req.headers.get("x-vercel-proto") ?? "https";
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "";
  const requestBase = host ? `${proto}://${host}` : "";

  const base = configuredBase || requestBase;
  const target = `${base}/item/${encodeURIComponent(id)}?notify=1`;

  const qrSize = 220;
  const qrSvg = await QRCode.toString(target, { type: "svg", margin: 0, width: qrSize });

  const W = 340, H = 340;
  const qrX = (W - qrSize) / 2, qrY = 20;
  const nameY = qrY + qrSize + 24;
  const tagY = nameY + 20;

  const labelSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="100%" height="100%" fill="#ffffff"/>
  <g transform="translate(${qrX}, ${qrY})">
    ${qrSvg}
  </g>
  <text x="${W / 2}" y="${nameY}" font-family="Inter,system-ui,Segoe UI,Roboto,Arial"
        font-size="16" font-weight="600" fill="#111" text-anchor="middle">${escapeXML(name)}</text>
  <text x="${W / 2}" y="${tagY}" font-family="Inter,system-ui,Segoe UI,Roboto,Arial"
        font-size="12" fill="#444" text-anchor="middle">Low in Stock? Scan to notify manager</text>
</svg>`.trim();

  if (print) {
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Print Label</title>
<style>@page{margin:10mm}html,body{height:100%}body{margin:0;display:flex;align-items:center;justify-content:center}</style>
</head><body>${labelSvg}<script>window.onload=()=>{window.print();window.close();};</script></body></html>`;
    return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
  }

  return new Response(labelSvg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
