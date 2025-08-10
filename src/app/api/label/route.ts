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
      return NextResponse.json(
        { error: "Email not configured", missing: { user: !!user, pass: !!pass, to: !!to } },
        { status: 500 }
      );
    }

    // Gmail + app password
    const transporter = createTransport({
      service: "gmail",
      auth: { user, pass },
    });

    // Optional: verify SMTP login. Helpful for debugging.
    try {
      await transporter.verify();
    } catch (e) {
      console.error("SMTP verify failed:", e);
      return NextResponse.json({ error: "SMTP verify failed" }, { status: 500 });
    }

    const subject = `Replenish request: ${itemName ?? itemId}`;
    const lines = [
      "Hey, this is an automated message from the Lab Inventory Management System.",
      `It's been notified that ${itemName ?? itemId} should be replenished.`,
      base && itemId ? `Item link: ${base}/item/${itemId}` : "",
      message ? `Note: ${message}` : "",
    ].filter(Boolean);

    const result = await transporter.sendMail({
      from,
      to,
      subject,
      text: lines.join("\n"),
      html: lines.map((l) => `<p>${l}</p>`).join(""),
    });

    // Return nodemailer result so we can see accepted/rejected
    return NextResponse.json({
      ok: true,
      messageId: result.messageId,
      accepted: result.accepted,
      rejected: result.rejected,
      response: result.response,
    });
  } catch (e) {
    console.error("notify-email error:", e);
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
  }
}
