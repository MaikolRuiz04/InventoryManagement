// src/app/page.tsx
import Link from "next/link";

export default function Home() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Welcome</h1>
      <p className="text-gray-700">Start by adding an item, then print or scan its QR.</p>
      <ul className="list-disc pl-5">
        <li><Link className="text-blue-600 underline" href="/item/new">Add Item</Link></li>
        <li><Link className="text-blue-600 underline" href="/scan">Scan</Link></li>
        <li><Link className="text-blue-600 underline" href="/inventory">Inventory</Link></li>
      </ul>
    </div>
  );
}
