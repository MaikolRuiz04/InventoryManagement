// src/app/item/[id]/page.tsx
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
  const [loading, setLoading] = useState<boolean>(true);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Compute a base URL that works locally, preview, and prod
  const baseUrl = useMemo(() => {
    if (typeof window !== "undefined") return window.location.origin;
    return process.env.NEXT_PUBLIC_BASE_URL ?? "";
  }, []);

  const loadItem = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from("items")
      .select("*")
      .eq("id", id)
      .single();
    if (error) {
      setError(error.message);
      setItem(null);
    } else {
      setItem(data as Item);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    void loadItem();
  }, [loadItem]);

  const emailReplenish = useCallback(async () => {
    if (!item) return;
    try {
      const res = await fetch("/api/notify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemId: item.id,
          itemName: item.name,
          message: "Out of stock. Please replenish.",
        }),
      });
      if (!res.ok) throw new Error("Email request failed");
      setMessage("Notification email sent!");
    } catch (e) {
      setMessage("Failed to send email");
      // eslint-disable-next-line no-console
      console.error(e);
    }
  }, [item]);

  // Auto-notify if ?notify=1 is present
  useEffect(() => {
    if (item && search.get("notify") === "1") {
      void emailReplenish();
    }
  }, [item, search, emailReplenish]);

  if (loading) return <div className="p-6">Loading…</div>;
  if (error || !item) return <div className="p-6 text-red-600">Item not found.</div>;

  const low =
    item.type === "consumable" && (item.qty ?? 0) <= (item.min_qty ?? 0);

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

      {/* View QR */}
      <div className="mt-6">
        <Image
          src={`/api/qr?id=${item.id}&v=2`}
          alt="QR to view item"
          width={160}
          height={160}
          className="border rounded"
          unoptimized
        />
      </div>

      {/* Notify QR */}
      <div>
        <div className="font-medium">Scan to notify manager</div>
        <Image
          src={`/api/qr?url=${encodeURIComponent(
            `${baseUrl}/item/${item.id}?notify=1`
          )}&v=2`}
          alt="QR to notify"
          width={160}
          height={160}
          className="border rounded"
          unoptimized
        />
      </div>

      {/* Manual notify button */}
      <div>
        <button
          onClick={() => void emailReplenish()}
          className="bg-black text-white px-4 py-2 rounded"
        >
          Email manager: out of stock
        </button>
        {message && <div className="mt-2 text-sm text-gray-700">{message}</div>}
      </div>
    </div>
  );
}
