"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import Image from "next/image";

type ItemType = "consumable" | "tool";

type ItemInsert = {
  name: string;
  type: ItemType;
  location?: string | null;
  qty?: number | null;
  min_qty?: number | null;
  buy_link?: string | null;
  notes?: string | null;
};

export default function NewItemPage() {
  const [form, setForm] = useState({
    name: "",
    type: "consumable" as ItemType,
    location: "",
    qty: 0,
    min_qty: 0,
    buy_link: "",
    notes: "",
  });
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload: ItemInsert = {
        name: form.name.trim(),
        type: form.type,
        location: form.location.trim() || null,
        buy_link: form.buy_link.trim() || null,
        notes: form.notes.trim() || null,
        qty: form.type === "consumable" ? Number(form.qty) || 0 : 0,
        min_qty: form.type === "consumable" ? Number(form.min_qty) || 0 : 0,
      };

      const { data, error } = await supabase
        .from("items")
        .insert(payload)
        .select("id")
        .single();

      if (error) throw error;
      setCreatedId(data!.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create item");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold mb-4">Add Item</h1>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-sm">Name</label>
          <input
            className="border rounded w-full p-2"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            required
          />
        </div>

        <div>
          <label className="block text-sm">Type</label>
          <select
            className="border rounded w-full p-2"
            value={form.type}
            onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as ItemType }))}
          >
            <option value="consumable">Consumable</option>
            <option value="tool">Tool</option>
          </select>
        </div>

        <div>
          <label className="block text-sm">Location</label>
          <input
            className="border rounded w-full p-2"
            placeholder="Lab A > Cab 1 > Bin 3"
            value={form.location}
            onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
          />
        </div>

        {form.type === "consumable" && (
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-sm">Quantity</label>
              <input
                type="number"
                min={0}
                className="border rounded w-full p-2"
                value={form.qty}
                onChange={(e) => setForm((f) => ({ ...f, qty: Number(e.target.value) }))}
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm">Min Qty</label>
              <input
                type="number"
                min={0}
                className="border rounded w-full p-2"
                value={form.min_qty}
                onChange={(e) => setForm((f) => ({ ...f, min_qty: Number(e.target.value) }))}
              />
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm">Buy Link</label>
          <input
            className="border rounded w-full p-2"
            placeholder="https://supplier.com/part"
            value={form.buy_link}
            onChange={(e) => setForm((f) => ({ ...f, buy_link: e.target.value }))}
          />
        </div>

        <div>
          <label className="block text-sm">Notes</label>
          <textarea
            className="border rounded w-full p-2"
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
          />
        </div>

        <button
          disabled={saving}
          className="bg-black text-white px-4 py-2 rounded disabled:opacity-50"
        >
          {saving ? "Saving..." : "Create Item"}
        </button>

        {error && <p className="text-red-600">{error}</p>}
      </form>

      {createdId && (
        <div className="mt-8">
          <h2 className="font-medium mb-2">Label / QR</h2>
          <div className="flex items-center gap-4">
            <Image
              src={`/api/qr?id=${createdId}`}
              alt="QR"
              width={160}
              height={160}
              className="border rounded"
              unoptimized
            />
            <div className="space-y-2">
              <a className="text-blue-600 underline" href={`/item/${createdId}`} target="_blank" rel="noreferrer">
                Open item page
              </a>
              <p className="text-sm text-gray-600 break-all">{createdId}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
