  import Link from "next/link";
  import { supabase } from "@/lib/supabase";

  export const dynamic = "force-dynamic"; // always fetch fresh on server

  type Row = {
    id: string;
    name: string;
    type: "consumable" | "tool";
    location: string | null;
    qty: number | null;
    min_qty: number | null;
  };

  export default async function InventoryPage() {
    const { data, error } = await supabase
      .from("items")
      .select("id,name,type,location,qty,min_qty")
      .order("name");

    if (error) {
      return <div className="p-6 text-red-600">Failed to load inventory: {error.message}</div>;
    }

    const items = (data ?? []) as Row[];

    if (items.length === 0) {
      return (
        <div className="p-6">
          <h1 className="text-2xl font-semibold mb-2">Inventory</h1>
          <p className="text-gray-700">
            No items yet. Add one on{" "}
            <Link className="text-blue-600 underline" href="/item/new">Add Item</Link>.
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Inventory</h1>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((it) => {
            const low = it.type === "consumable" && (it.qty ?? 0) <= (it.min_qty ?? 0);
            return (
              <Link
                key={it.id}
                href={`/item/${it.id}`}
                className="border rounded-lg p-4 bg-black hover:shadow"
              >
                <div className="flex items-start justify-between gap-2">
                  <h2 className="font-medium">{it.name}</h2>
                  <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-black">{it.type}</span>
                </div>
                {it.location && <div className="text-sm text-gray-600 mt-1">{it.location}</div>}
                {it.type === "consumable" && (
                  <div className="mt-2 text-sm">
                    Qty: <b>{it.qty ?? 0}</b>{" "}
                    <span className={`ml-2 text-xs px-1.5 py-0.5 rounded ${low ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>
                      {low ? "Low" : "OK"}
                    </span>
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      </div>
    );
  }
