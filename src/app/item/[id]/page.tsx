"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Image from "next/image";
import { supabase } from "@/lib/supabase";

type Item = {
  id: string;
  name: string;
  type: "consumable" | "tool";
  location: string | null;
  qty: number | null;
  min_qty: number | null;
  buy_link: string | null;
  notes: string | null;
};

export default function ItemPage() {
  const { id } = useParams<{ id: string }>();
  const search = useSearchParams();

  const [item, setItem] = useState<Item | null>(null);
  const [loading, setLoading] = useState(true);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Works on localhost, preview, prod
  const baseUrl = useMemo(() => {
    if (typeof window !== "undefined") return window.location.origin;
    return process.env.NEXT_PUBLIC_BASE_URL ?? "";
  }, []);

  // Load item
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("items")
        .select("*")
        .eq("id", id)
        .single();
      if (error) setErr(error.message);
      setItem(data as Item);
      setLoading(false);
    })();
  }, [id]);

  // Send email
  const emailReplenish = useCallback(async () => {
    if (!item || sent) return;
    try {
      const r = await fetch("/api/notify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemId: item.id,
          itemName: item.name,
          message: "Auto-notify via QR scan",
        }),
      });
      if (!r.ok) throw new Error("Notify failed");
      setSent(true);
    } catch {
      setErr("Failed to send email");
    }
  }, [item, sent]);

  // Auto-notify when opened via QR (…/item/[id]?notify=1)
  useEffect(() => {
    if (item && search.get("notify") === "1") {
      void emailReplenish();
    }
  }, [item, search, emailReplenish]);

  // Build the QR URL once we have item
  const qrUrl = useMemo(() => {
    if (!item) return "";
    return `/api/qr?url=${encodeURIComponent(
      `${baseUrl}/item/${item.id}?notify=1`
    )}&v=3`;
  }, [baseUrl, item]);

  // Print a clean label: single composed IMAGE = QR + name + Low/OK + small ID
  const handlePrint = useCallback(() => {
    if (!item) return;

    // Compute low/ok locally (do not alter other code paths)
    const isLow =
      item.type === "consumable" && (item.qty ?? 0) <= (item.min_qty ?? 0);

    // Absolute QR URL prevents blank images in a new window
    const absoluteQr = qrUrl.startsWith("http")
      ? qrUrl
      : `${baseUrl}${qrUrl}`;

    const printWin = window.open("", "_blank", "noopener,noreferrer");
    if (!printWin) return;

    const safeName = item.name.replace(/</g, "&lt;").replace(/>/g, "&gt;");

    // Write a minimal HTML shell that draws onto a canvas, converts to a single IMG, then prints
    printWin.document.open();
    printWin.document.write(`
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>Print Label - ${safeName}</title>
          <style>
            @page { margin: 12mm; }
            body { margin: 0; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial, Noto Sans, "Apple Color Emoji","Segoe UI Emoji"; }
            .wrap { display: flex; align-items: center; justify-content: center; padding: 16px; }
            img.final { max-width: 100%; height: auto; display: block; }
          </style>
          <base href="${baseUrl}/">
        </head>
        <body>
          <div class="wrap">
            <canvas id="c" width="340" height="380" style="display:none"></canvas>
            <img id="final" class="final" alt="Label"/>
          </div>
          <script>
            (function() {
              const qrSrc = ${JSON.stringify(absoluteQr)};
              const name = ${JSON.stringify(item.name)};
              const id = ${JSON.stringify(item.id)};
              const isLow = ${JSON.stringify(isLow)};

              const canvas = document.getElementById('c');
              const ctx = canvas.getContext('2d');

              // Layout constants
              const W = canvas.width;           // 340
              const H = canvas.height;          // 380
              const P = 12;                     // padding
              const QR_SIZE = 260;              // QR side
              const TOP = P;                    // top margin

              // Colors matching UI badges (approx)
              const okBg = '#d1fae5';
              const okFg = '#065f46';
              const lowBg = '#fee2e2';
              const lowFg = '#b91c1c';

              // Draw white background
              ctx.fillStyle = '#ffffff';
              ctx.fillRect(0, 0, W, H);

              // Load QR then draw
              const img = new Image();
              img.crossOrigin = 'anonymous';
              img.onload = function() {
                // Center QR
                const qrX = (W - QR_SIZE) / 2;
                ctx.drawImage(img, qrX, TOP, QR_SIZE, QR_SIZE);

                // Name text
                ctx.fillStyle = '#111827';
                ctx.font = '600 20px system-ui, -apple-system, Segoe UI, Roboto, Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'top';
                const nameY = TOP + QR_SIZE + 10;
                // Wrap name if too long (simple wrap)
                const maxWidth = W - P*2;
                const lines = wrapText(ctx, name, maxWidth);
                let textY = nameY;
                lines.forEach(line => {
                  ctx.fillText(line, W/2, textY);
                  textY += 22;
                });

                // Status badge (only for consumables)
                if (${JSON.stringify(item.type)} === 'consumable') {
                  const label = isLow ? 'Low' : 'OK';
                  const fg = isLow ? lowFg : okFg;
                  const bg = isLow ? lowBg : okBg;

                  ctx.font = '500 14px system-ui, -apple-system, Segoe UI, Roboto, Arial';
                  const padX = 8, padY = 4;
                  const txtW = ctx.measureText(label).width;
                  const badgeW = txtW + padX*2;
                  const badgeH = 22;
                  const badgeX = (W - badgeW) / 2;
                  const badgeY = textY + 4;

                  // rounded rect
                  roundRect(ctx, badgeX, badgeY, badgeW, badgeH, 6, bg);
                  // text
                  ctx.fillStyle = fg;
                  ctx.textBaseline = 'middle';
                  ctx.fillText(label, W/2, badgeY + badgeH/2);

                  textY = badgeY + badgeH;
                }

                // Small ID text
                ctx.font = '400 12px system-ui, -apple-system, Segoe UI, Roboto, Arial';
                ctx.fillStyle = '#6b7280';
                ctx.textBaseline = 'top';
                ctx.fillText(id, W/2, textY + 8);

                // Convert to image and print
                const final = document.getElementById('final');
                final.onload = function() {
                  // Ensure image is in DOM, then print
                  setTimeout(function(){
                    window.print();
                    window.close();
                  }, 50);
                };
                final.src = canvas.toDataURL('image/png');
              };
              img.onerror = function() {
                // If QR fails, still print something to avoid blank window
                ctx.fillStyle = '#ef4444';
                ctx.font = '600 18px system-ui, -apple-system, Segoe UI, Roboto, Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('QR failed to load', W/2, H/2);
                const final = document.getElementById('final');
                final.onload = function() {
                  setTimeout(function(){
                    window.print();
                    window.close();
                  }, 50);
                };
                final.src = canvas.toDataURL('image/png');
              };
              img.src = qrSrc;

              // Helpers
              function wrapText(ctx, text, maxWidth) {
                const words = text.split(/\\s+/);
                const lines = [];
                let line = '';
                for (let i=0; i<words.length; i++) {
                  const test = line ? line + ' ' + words[i] : words[i];
                  if (ctx.measureText(test).width <= maxWidth) {
                    line = test;
                  } else {
                    if (line) lines.push(line);
                    line = words[i];
                  }
                }
                if (line) lines.push(line);
                // Limit to 2 lines, ellipsize
                if (lines.length > 2) {
                  const first = lines[0];
                  let second = '';
                  // Rebuild second line with ellipsis if needed
                  for (let i=1; i<lines.length; i++) {
                    const candidate = second ? (second + ' ' + lines[i]) : lines[i];
                    if (ctx.measureText(candidate + '…').width <= maxWidth) {
                      second = candidate;
                    } else {
                      break;
                    }
                  }
                  lines.length = 2;
                  lines[0] = first;
                  lines[1] = second + '…';
                }
                return lines;
              }

              function roundRect(ctx, x, y, w, h, r, fill) {
                ctx.beginPath();
                ctx.moveTo(x + r, y);
                ctx.arcTo(x + w, y, x + w, y + h, r);
                ctx.arcTo(x + w, y + h, x, y + h, r);
                ctx.arcTo(x, y + h, x, y, r);
                ctx.arcTo(x, y, x + w, y, r);
                ctx.closePath();
                ctx.fillStyle = fill;
                ctx.fill();
              }
            })();
          </script>
        </body>
      </html>
    `);
    printWin.document.close();
  }, [item, qrUrl, baseUrl]);

  if (loading) return <div className="p-6">Loading…</div>;
  if (err || !item) return <div className="p-6 text-red-600">Item not found.</div>;

  const low =
    item.type === "consumable" && (item.qty ?? 0) <= (item.min_qty ?? 0);

  // If this was a notify scan, show a tiny confirmation screen
  if (search.get("notify") === "1") {
    return (
      <div className="max-w-md space-y-4">
        <h1 className="text-2xl font-semibold">Thanks!</h1>
        <p>
          Notification sent to the lab manager for <b>{item.name}</b>.
        </p>
        {sent ? (
          <p className="text-green-700">Email sent ✅</p>
        ) : (
          <p className="text-gray-600">Sending…</p>
        )}
      </div>
    );
  }

  // Regular item page (details + single "notify" QR + name + print)
  return (
    <div className="max-w-2xl space-y-4">
      <h1 className="text-2xl font-semibold">{item.name}</h1>
      <div className="text-sm text-gray-600">Type: {item.type}</div>
      {item.location && <div>Location: {item.location}</div>}

      {item.type === "consumable" && (
        <div className="text-sm">
          Qty: <b>{item.qty ?? 0}</b>{" "}
          <span
            className={`ml-2 text-xs px-1.5 py-0.5 rounded ${
              low ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
            }`}
          >
            {low ? "Low" : "OK"}
          </span>
        </div>
      )}

      {item.buy_link && (
        <div>
          <a
            className="text-blue-600 underline"
            href={item.buy_link}
            target="_blank"
            rel="noreferrer"
          >
            Buy link
          </a>
        </div>
      )}

      {item.notes && <div className="whitespace-pre-wrap">{item.notes}</div>}

      {/* Single QR = scan to notify */}
      <div className="mt-6">
        <div className="font-medium mb-2">Scan to notify manager</div>
        <div className="inline-flex flex-col items-center gap-2">
          <Image
            src={qrUrl}
            alt="Scan to notify"
            width={180}
            height={180}
            className="border rounded"
            unoptimized
          />
          {/* Name under the QR */}
          <div className="text-sm font-medium text-center">{item.name}</div>
          <button
            onClick={handlePrint}
            className="mt-2 bg-black text-white px-4 py-2 rounded hover:opacity-90"
          >
            Print label
          </button>
        </div>
      </div>
    </div>
  );
}
