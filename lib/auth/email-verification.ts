import crypto from "crypto";
import { Resend } from "resend";
import { prisma } from "@/lib/db/prisma";

const BRAND = process.env.BRAND_NAME ?? "GoList.me";
const FROM = process.env.RESEND_FROM || `${BRAND} <onboarding@resend.dev>`;
const TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

export function hashVerificationToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function createEmailVerificationToken(userId: string): Promise<string> {
  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashVerificationToken(token);
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);

  await prisma.$transaction([
    prisma.emailVerificationToken.deleteMany({ where: { userId, usedAt: null } }),
    prisma.emailVerificationToken.create({ data: { userId, tokenHash, expiresAt } }),
  ]);

  return token;
}

export function buildVerificationUrl(token: string): string {
  const base =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXTAUTH_URL ||
    "http://localhost:3000";
  return `${base.replace(/\/$/, "")}/api/auth/verify-email?token=${encodeURIComponent(token)}`;
}

export async function sendVerificationEmail({
  to,
  name,
  token,
}: {
  to: string;
  name?: string | null;
  token: string;
}): Promise<{ ok: boolean; skipped?: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("[VERIFY EMAIL] RESEND_API_KEY not set; skipping send.");
    return { ok: false, skipped: true };
  }

  const verifyUrl = buildVerificationUrl(token);
  const greeting = name ? `Hi ${name},` : "Hi,";

  try {
    const resend = new Resend(apiKey);
    const { data, error } = await resend.emails.send({
      from: FROM,
      to,
      subject: `Verify your ${BRAND} email`,
      html: `
        <div style="font-family:Arial,Helvetica,sans-serif;line-height:1.6;color:#111">
          <h2 style="margin:0 0 12px">Verify your email</h2>
          <p>${greeting}</p>
          <p>Thanks for creating a ${BRAND} account. Confirm your email address to finish setting up your workspace.</p>
          <p style="margin:18px 0">
            <a href="${verifyUrl}" style="display:inline-block;background:#111827;color:#fff;padding:11px 18px;border-radius:6px;text-decoration:none">
              Verify email address
            </a>
          </p>
          <p>Or copy and paste this link into your browser:</p>
          <p style="word-break:break-all;color:#4b5563">${verifyUrl}</p>
          <p style="color:#6b7280;font-size:12px">This link expires in 24 hours. If you did not create this account, you can ignore this email.</p>
        </div>
      `,
    });

    if (error) {
      console.error("[VERIFY EMAIL] Resend error", error);
      return { ok: false, error: String(error) };
    }

    console.log("[VERIFY EMAIL] sent", { to, id: data?.id });
    return { ok: true };
  } catch (err) {
    console.error("[VERIFY EMAIL] send failed", err);
    return { ok: false, error: (err as Error).message };
  }
}

export async function consumeEmailVerificationToken(
  token: string
): Promise<{ userId: string } | null> {
  if (!token) return null;
  const tokenHash = hashVerificationToken(token);

  const record = await prisma.emailVerificationToken.findUnique({
    where: { tokenHash },
    select: { id: true, userId: true, expiresAt: true, usedAt: true },
  });

  if (!record || record.usedAt || record.expiresAt < new Date()) return null;

  await prisma.$transaction([
    prisma.emailVerificationToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
    prisma.user.update({
      where: { id: record.userId },
      data: { emailVerified: new Date() },
    }),
  ]);

  return { userId: record.userId };
}