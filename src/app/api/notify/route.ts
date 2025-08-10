// src/app/api/notify/route.ts
export const runtime = "nodejs";

import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  const { itemId, message, itemName, buyLink } = await req.json();
  const webhook = process.env.SLACK_WEBHOOK_URL;
  if (!webhook) {
    return new Response("Slack webhook not configured", { status: 500 });
  }

  const text = [
    `🔔 *Inventory Notification*`,
    itemName ? `• Item: ${itemName}` : `• Item ID: ${itemId}`,
    message ? `• Note: ${message}` : null,
    buyLink ? `• Buy: ${buyLink}` : null,
  ].filter(Boolean).join("\n");

  await fetch(webhook, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });

  return Response.json({ ok: true });
}
