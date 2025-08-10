// src/app/item/[id]/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";

export default function ItemPage() {
  const { id } = useParams();
  const search = useSearchParams();

  const [item, setItem] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const fetchItem = async () => {
      try {
        const res = await fetch(`/api/item?id=${id}`);
        if (!res.ok) throw new Error("Failed to load item");
        const data = await res.json();
        setItem(data);
      } catch (err) {
        console.error(err);
        setMessage("Error loading item");
      } finally {
        setLoading(false);
      }
    };

    fetchItem();
  }, [id]);

  // Auto-notify if ?notify=1
  useEffect(() => {
    if (item && search.get("notify") === "1") {
      emailReplenish();
    }
  }, [item, search]);

  const emailReplenish = async () => {
    try {
      const res = await fetch("/api/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: item.id,
          name: item.name,
        }),
      });

      if (!res.ok) throw new Error("Email request failed");
      setMessage("Notification email sent!");
    } catch (err) {
      console.error(err);
      setMessage("Failed to send email");
    }
  };

  if (loading) return <p>Loading...</p>;
  if (!item) return <p>Item not found</p>;

  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL ||
    (typeof window !== "undefined" ? window.location.origin : "");

  return (
    <div style={{ padding: "2rem" }}>
      <h1>{item.name}</h1>
      <p>{item.description}</p>

      <h3>Scan to View</h3>
      <img
        src={`/api/qr?id=${item.id}&v=2`}
        alt="QR Code"
        width={200}
        height={200}
      />

      <h3>Scan to Notify</h3>
      <img
        src={`/api/qr?url=${encodeURIComponent(
          `${baseUrl}/item/${item.id}?notify=1`
        )}&v=2`}
        alt="Notify QR Code"
        width={200}
        height={200}
      />

      <div style={{ marginTop: "1rem" }}>
        <button onClick={emailReplenish}>Send Notification Email</button>
      </div>

      {message && <p>{message}</p>}
    </div>
  );
}
