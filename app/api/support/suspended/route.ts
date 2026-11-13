import { NextResponse } from "next/server";
import { Resend } from "resend";
import { z } from "zod";

const schema = z.object({
  firstName: z.string().trim().min(1, "First name is required"),
  lastName: z.string().trim().min(1, "Last name is required"),
  email: z.string().trim().email("A valid account email is required"),
  message: z.string().trim().min(10, "Please describe the issue"),
});

const BRAND = process.env.BRAND_NAME ?? "GoList.me";
const FROM = process.env.RESEND_FROM || `${BRAND} <onboarding@resend.dev>`;
const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || "support@golist.me";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function POST(request: Request) {
  try {
    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid fields", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.error("[SUPPORT] RESEND_API_KEY is not configured");
      return NextResponse.json(
        { error: "Email support is not configured" },
        { status: 503 }
      );
    }

    const { firstName, lastName, email, message } = parsed.data;
    const resend = new Resend(apiKey);

    const { error } = await resend.emails.send({
      from: FROM,
      to: SUPPORT_EMAIL,
      replyTo: email,
      subject: `Suspended account appeal: ${email}`,
      html: `
        <div style="font-family:Arial,Helvetica,sans-serif;line-height:1.6;color:#111">
          <h2 style="margin:0 0 12px">Suspended account appeal</h2>
          <p><strong>Name:</strong> ${escapeHtml(firstName)} ${escapeHtml(lastName)}</p>
          <p><strong>Account email:</strong> ${escapeHtml(email)}</p>
          <p><strong>Message:</strong></p>
          <p style="white-space:pre-wrap;border-left:3px solid #e5e7eb;padding-left:12px">${escapeHtml(
            message
          )}</p>
          <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0" />
          <p style="color:#6b7280;font-size:12px">Sent from the ${BRAND} suspended-account page.</p>
        </div>
      `,
    });

    if (error) {
      console.error("[SUPPORT] Resend error", error);
      return NextResponse.json(
        { error: "Failed to send message to support" },
        { status: 502 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[SUPPORT] Suspended appeal error", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}