// src/app/api/notify-email/route.ts
export const runtime = "nodejs";

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { createTransport } from "nodemailer";

export async function POST(req: NextRequest) {
  try {
    const { itemId, itemName, message } = await req.json();

    const user = process.env.SMTP_USER || "";
    const pass = process.env.SMTP_PASS || "";
    const to = process.env.NOTIFY_TO || "";
    const from = process.env.NOTIFY_FROM || `Lab Inventory <${user}>`;
    const base = process.env.NEXT_PUBLIC_BASE_URL || "";

    if (!user || !pass || !to) {
      return NextResponse.json({ error: "Email not configured" }, { status: 500 });
    }

    // Gmail transport (app password required)
    const transporter = createTransport({
      service: "gmail",
      auth: { user, pass },
    });

    const subject = `Replenish request: ${itemName ?? itemId}`;
    const body = [
      "Hey, this is an automated message from the Lab Inventory Management System.",
      `It's been notified that ${itemName ?? itemId} should be replenished.`,
      base && itemId ? `Item link: ${base}/item/${itemId}` : "",
      message ? `Note: ${message}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    await transporter.sendMail({
      from,
      to,
      subject,
      text: body,
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
  }
}
