"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Image from "next/image";

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
  const [item, setItem] = useState<Item | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { data, error } = await supabase.from("items").select("*").eq("id", id).single();
    if (error) setError(error.message);
    setItem(data as Item);
    setLoading(false);
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (loading) return <div>Loading…</div>;
  if (error || !item) return <div className="text-red-600">Item not found.</div>;

  const low = item.type === "consumable" && (item.qty ?? 0) <= (item.min_qty ?? 0);

  return (
    <div className="max-w-2xl space-y-4">
      <h1 className="text-2xl font-semibold">{item.name}</h1>
      <div className="text-sm text-gray-600">Type: {item.type}</div>
      {item.location && <div>Location: {item.location}</div>}
      {item.type === "consumable" && (
        <div className="text-sm">
          Qty: <b>{item.qty ?? 0}</b>{" "}
          <span className={`ml-2 text-xs px-1.5 py-0.5 rounded ${low ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>
            {low ? "Low" : "OK"}
          </span>
        </div>
      )}
      {item.buy_link && (
        <div>
          <a className="text-blue-600 underline" href={item.buy_link} target="_blank" rel="noreferrer">
            Buy link
          </a>
        </div>
      )}
      {item.notes && <div className="whitespace-pre-wrap">{item.notes}</div>}

      <div className="mt-6">
        <Image
          src={`/api/qr?id=${item.id}`}
          alt="QR"
          width={160}
          height={160}
          className="border rounded"
          unoptimized
        />
      </div>
    </div>
  );
}
