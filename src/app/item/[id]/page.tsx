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

  // Print a clean label: QR + name + small ID
  const handlePrint = useCallback(() => {
    if (!item) return;
    const printWin = window.open("", "_blank", "noopener,noreferrer");
    if (!printWin) return;

    const safeName = item.name.replace(/</g, "&lt;").replace(/>/g, "&gt;");

    printWin.document.write(`
      <html>
        <head>
          <title>Print Label - ${safeName}</title>
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <style>
            @page { margin: 12mm; }
            body { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial, Noto Sans, "Apple Color Emoji","Segoe UI Emoji"; }
            .wrap { display: flex; flex-direction: column; align-items: center; gap: 10px; }
            .name { font-size: 18px; font-weight: 600; text-align: center; }
            .id { font-size: 12px; color: #555; text-align: center; }
            .qr { width: 220px; height: 220px; }
            .hint { font-size: 11px; color: #777; text-align: center; }
          </style>
        </head>
        <body>
          <div class="wrap">
            <img class="qr" src="${qrUrl}" alt="QR" />
            <div class="name">${safeName}</div>
            <div class="id">${item.id}</div>
            <div class="hint">Scan to notify manager</div>
          </div>
          <script>
            window.onload = () => { window.print(); window.close(); };
          </script>
        </body>
      </html>
    `);
    printWin.document.close();
  }, [item, qrUrl]);

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
            alt="Low in Stock? Scan to notify"
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
