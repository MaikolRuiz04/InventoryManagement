"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
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

type Note = {
  id: string;
  author: string | null;
  body: string;
  created_at: string;
};

export default function ItemPage() {
  const { id } = useParams<{ id: string }>();
  const [item, setItem] = useState<Item | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [author, setAuthor] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [notes, setNotes] = useState<Note[]>([]);
  const [notifyMsg, setNotifyMsg] = useState("");

  async function load() {
    const [{ data: it, error: e1 }, { data: ns, error: e2 }] = await Promise.all([
      supabase.from("items").select("*").eq("id", id).single(),
      supabase.from("item_notes").select("*").eq("item_id", id).order("created_at", { ascending: false })
    ]);
    if (e1) setError(e1.message);
    setItem(it as Item);
    if (!e2 && ns) setNotes(ns as Note[]);
    setLoading(false);
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

  async function addNote(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setSending(true);
    await supabase.from("item_notes").insert({
      item_id: id,
      author: author.trim() || null,
      body: body.trim(),
    });
    setBody("");
    setSending(false);
    load();
  }

  async function notifyManager() {
    await fetch("/api/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        itemId: id,
        itemName: item?.name,
        buyLink: item?.buy_link,
        message: notifyMsg || "User notification from item page.",
      }),
    });
    setNotifyMsg("");
    alert("Sent to lab manager ✅");
  }

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
          <a className="text-blue-600 underline" href={item.buy_link} target="_blank">Buy link</a>
        </div>
      )}
      {item.notes && <div className="whitespace-pre-wrap">{item.notes}</div>}

      {/* Notify manager */}
      <div className="border rounded-lg p-4 bg-white">
        <div className="font-medium mb-2">Notify lab manager</div>
        <textarea
          className="w-full border rounded p-2"
          placeholder="What do you want to say? (e.g., Out of bits, please reorder)"
          value={notifyMsg}
          onChange={(e) => setNotifyMsg(e.target.value)}
        />
        <button onClick={notifyManager} className="mt-2 bg-black text-white px-4 py-2 rounded">
          Send Notification
        </button>
      </div>

      {/* Notes / comments */}
      <div className="border rounded-lg p-4 bg-white">
        <div className="font-medium mb-2">Item comments</div>
        <form onSubmit={addNote} className="space-y-2">
          <input
            className="border rounded w-full p-2"
            placeholder="Your name or email (optional)"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
          />
          <textarea
            className="border rounded w-full p-2"
            placeholder="Leave a note about this item…"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            required
          />
          <button disabled={sending} className="bg-black text-white px-4 py-2 rounded disabled:opacity-50">
            {sending ? "Saving…" : "Add Note"}
          </button>
        </form>

        <div className="mt-4 space-y-3">
          {notes.map((n) => (
            <div key={n.id} className="border rounded p-3">
              <div className="text-sm text-gray-600">
                {n.author || "Anonymous"} • {new Date(n.created_at).toLocaleString()}
              </div>
              <div className="mt-1 whitespace-pre-wrap">{n.body}</div>
            </div>
          ))}
          {notes.length === 0 && <div className="text-sm text-gray-600">No comments yet.</div>}
        </div>
      </div>

      <div className="mt-6">
        <img src={`/api/qr?id=${item.id}`} alt="QR" className="w-40 h-40 border rounded" />
      </div>
    </div>
  );
}
