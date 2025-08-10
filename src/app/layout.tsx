// app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Lab Inventory (MVP)",
  description: "Inventory + Tool tracking",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 text-gray-900">
        <header className="border-b bg-white">
          <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-6">
            <a href="/" className="font-semibold">Lab Inventory</a>
            <nav className="text-sm flex gap-4">
              <a className="hover:underline" href="/item/new">Add Item</a>
              <a className="hover:underline" href="/scan">Scan</a>
              <a className="hover:underline" href="/inventory">Inventory</a>
            </nav>
          </div>
        </header>
        <main className="max-w-5xl mx-auto px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
