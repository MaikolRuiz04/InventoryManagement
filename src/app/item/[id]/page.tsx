"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import NextImage from "next/image"; // avoid clash with window.Image
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

  // Print a clean label by composing on a hidden canvas, then printing via hidden iframe
  const handlePrint = useCallback(() => {
    if (!item) return;

    const isLow =
      item.type === "consumable" && (item.qty ?? 0) <= (item.min_qty ?? 0);

    // Ensure absolute QR URL
    const absoluteQr = qrUrl.startsWith("http") ? qrUrl : `${baseUrl}${qrUrl}`;

    // 1) Build an offscreen canvas in THIS window (no CSP issues)
    const canvas = document.createElement("canvas");
    canvas.width = 340;
    canvas.height = 380;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const okBg = "#d1fae5";
    const okFg = "#065f46";
    const lowBg = "#fee2e2";
    const lowFg = "#b91c1c";

    const W = canvas.width;
    const P = 12;
    const QR_SIZE = 260;
    const TOP = P;

    // background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, W, canvas.height);

    // loader helper (typed, and explicitly use window.Image)
    function load(imgSrc: string): Promise<HTMLImageElement> {
      return new Promise((resolve, reject) => {
        const img = new window.Image();
        img.crossOrigin = "anonymous";
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error(`Failed to load image: ${imgSrc}`));
        img.src = imgSrc;
      });
    }

    function wrapText(
      context: CanvasRenderingContext2D,
      text: string,
      maxWidth: number
    ) {
      const words = text.split(/\s+/);
      const lines: string[] = [];
      let line = "";
      for (let i = 0; i < words.length; i++) {
        const test = line ? line + " " + words[i] : words[i];
        if (context.measureText(test).width <= maxWidth) {
          line = test;
        } else {
          if (line) lines.push(line);
          line = words[i];
        }
      }
      if (line) lines.push(line);
      if (lines.length > 2) {
        const first = lines[0];
        let second = "";
        for (let i = 1; i < lines.length; i++) {
          const cand = second ? second + " " + words[i] : words[i];
          if (context.measureText(cand + "…").width <= maxWidth) {
            second = cand;
          } else break;
        }
        return [first, second + "…"];
      }
      return lines;
    }

    function roundRect(
      context: CanvasRenderingContext2D,
      x: number,
      y: number,
      w: number,
      h: number,
      r: number,
      fill: string
    ) {
      context.beginPath();
      context.moveTo(x + r, y);
      context.arcTo(x + w, y, x + w, y + h, r);
      context.arcTo(x + w, y + h, x, y + h, r);
      context.arcTo(x, y + h, x, y, r);
      context.arcTo(x, y, x + w, y, r);
      context.closePath();
      context.fillStyle = fill;
      context.fill();
    }

    (async () => {
      try {
        const qrImg = await load(absoluteQr);

        // draw QR
        const qrX = (W - QR_SIZE) / 2;
        ctx.drawImage(qrImg, qrX, TOP, QR_SIZE, QR_SIZE);

        // name
        ctx.fillStyle = "#111827";
        ctx.font =
          "600 20px system-ui, -apple-system, Segoe UI, Roboto, Arial, Noto Sans";
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        const nameY = TOP + QR_SIZE + 10;
        const maxWidth = W - P * 2;
        const lines = wrapText(ctx, item.name, maxWidth);
        let textY = nameY;
        for (const line of lines) {
          ctx.fillText(line, W / 2, textY);
          textY += 22;
        }

        // status
        if (item.type === "consumable") {
          const label = isLow ? "Low" : "OK";
          const fg = isLow ? lowFg : okFg;
          const bg = isLow ? lowBg : okBg;

          ctx.font =
            "500 14px system-ui, -apple-system, Segoe UI, Roboto, Arial, Noto Sans";
          const padX = 8;
          const txtW = ctx.measureText(label).width;
          const badgeW = txtW + padX * 2;
          const badgeH = 22;
          const badgeX = (W - badgeW) / 2;
          const badgeY = textY + 4;

          roundRect(ctx, badgeX, badgeY, badgeW, badgeH, 6, bg);
          ctx.fillStyle = fg;
          ctx.textBaseline = "middle";
          ctx.fillText(label, W / 2, badgeY + badgeH / 2);

          textY = badgeY + badgeH;
        }

        // small id
        ctx.font =
          "400 12px system-ui, -apple-system, Segoe UI, Roboto, Arial, Noto Sans";
        ctx.fillStyle = "#6b7280";
        ctx.textBaseline = "top";
        ctx.fillText(item.id, W / 2, textY + 8);

        const dataUrl = canvas.toDataURL("image/png");

        // 2) Create a hidden iframe, load the composed image, print from parent
        const iframe = document.createElement("iframe");
        iframe.style.position = "fixed";
        iframe.style.right = "0";
        iframe.style.bottom = "0";
        iframe.style.width = "0";
        iframe.style.height = "0";
        iframe.style.border = "0";
        iframe.onload = () => {
          try {
            const doc = iframe.contentDocument!;
            const img = doc.getElementById("final") as HTMLImageElement | null;
            if (img) {
              img.onload = () => {
                setTimeout(() => {
                  iframe.contentWindow?.focus();
                  iframe.contentWindow?.print();
                  setTimeout(() => iframe.remove(), 300);
                }, 50);
              };
              img.src = dataUrl;
            }
          } catch {
            window.open(dataUrl, "_blank", "noopener,noreferrer");
            iframe.remove();
          }
        };
        iframe.srcdoc = `
          <!doctype html>
          <html>
            <head>
              <meta charset="utf-8" />
              <meta name="viewport" content="width=device-width, initial-scale=1" />
              <style>
                @page { margin: 12mm; }
                body { margin: 0; display: flex; align-items: center; justify-content: center; padding: 16px; }
                img { max-width: 100%; height: auto; display: block; }
              </style>
            </head>
            <body>
              <img id="final" alt="Label" />
            </body>
          </html>
        `;
        document.body.appendChild(iframe);
      } catch {
        const iframe = document.createElement("iframe");
        iframe.style.position = "fixed";
        iframe.style.right = "0";
        iframe.style.bottom = "0";
        iframe.style.width = "0";
        iframe.style.height = "0";
        iframe.style.border = "0";
        iframe.onload = () => {
          const doc = iframe.contentDocument!;
          doc.open();
          doc.write(
            '<!doctype html><html><body><div>QR failed to load</div></body></html>'
          );
          doc.close();
          iframe.contentWindow?.print();
          setTimeout(() => iframe.remove(), 300);
        };
        document.body.appendChild(iframe);
      }
    })();
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
          <NextImage
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
