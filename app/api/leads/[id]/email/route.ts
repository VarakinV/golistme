import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Resend } from "resend";
import { prisma } from "@/lib/db/prisma";
import { getAuthContext, hasPermission } from "@/lib/auth/workspace";
import { leadWhereForContext } from "@/lib/leads/query";

const schema = z.object({
  subject: z.string().trim().min(1).max(160),
  message: z.string().trim().min(1).max(6000),
});

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await getAuthContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(ctx, "VIEW_LEADS")) {
    return NextResponse.json({ error: "Missing permission" }, { status: 403 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Add a subject and a message before sending." },
      { status: 400 }
    );
  }

  const { id } = await params;
  const lead = await prisma.propertyInquiry.findFirst({
    where: { id, ...leadWhereForContext(ctx) },
    include: {
      order: { select: { propertyAddress: true, propertyFormattedAddress: true } },
    },
  });

  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  if (!lead.email) {
    return NextResponse.json(
      { error: "This lead does not have an email address." },
      { status: 400 }
    );
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Email is not configured. Please contact support." },
      { status: 503 }
    );
  }

  const sender = await prisma.user.findUnique({
    where: { id: ctx.userId },
    select: { email: true },
  });

  const address = lead.order?.propertyFormattedAddress || lead.order?.propertyAddress || "";
  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from: process.env.RESEND_FROM || "GoList.me <no-reply@golist.me>",
    to: lead.email,
    replyTo: sender?.email || undefined,
    subject: parsed.data.subject,
    html: `
      <div style="font-family: system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif; line-height:1.6; color:#111;">
        <p>${escapeHtml(parsed.data.message).replace(/\n/g, "<br />")}</p>
        ${address ? `<hr /><p style="color:#555;font-size:13px;">About ${escapeHtml(address)}</p>` : ""}
      </div>
    `,
  });

  if (error) {
    console.error("[LEAD EMAIL] Resend error", error);
    return NextResponse.json(
      { error: "The email could not be sent. Please try again." },
      { status: 502 }
    );
  }

  return NextResponse.json({ ok: true });
}
