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

  // Single label image (QR + name + tagline)
  const labelSrc = useMemo(() => {
    if (!item) return "";
    return `/api/label?id=${encodeURIComponent(item.id)}&name=${encodeURIComponent(
      item.name
    )}&v=4`;
  }, [item]);

  // Opens a clean print page that auto prints
  const handlePrint = useCallback(() => {
    if (!item) return;
    const url = `/api/label?id=${encodeURIComponent(item.id)}&name=${encodeURIComponent(
      item.name
    )}&print=1`;
    window.open(url, "_blank", "noopener,noreferrer");
  }, [item]);

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

  // Regular item page (details + single label + print)
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

      {/* Single label image (QR + name + tagline) */}
      <div className="mt-6">
        <div className="font-medium mb-2">Label (scan to notify)</div>
        <div className="inline-flex flex-col items-center gap-2">
          <Image
            src={labelSrc}
            alt="Label: scan to notify"
            width={340}
            height={340}
            className="border rounded bg-white"
            unoptimized
          />
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
