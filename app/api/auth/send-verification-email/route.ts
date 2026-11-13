import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";
import {
  createEmailVerificationToken,
  sendVerificationEmail,
} from "@/lib/auth/email-verification";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const session = await auth();
    const userId = (session?.user as { id?: string } | undefined)?.id;
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true, emailVerified: true, status: true },
    });

    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
    if (user.status !== "ACTIVE") {
      return NextResponse.json({ error: "Account is not active" }, { status: 403 });
    }
    if (user.emailVerified) {
      return NextResponse.json({ alreadyVerified: true });
    }

    const recent = await prisma.emailVerificationToken.findFirst({
      where: {
        userId,
        usedAt: null,
        createdAt: { gt: new Date(Date.now() - 60_000) },
      },
      select: { id: true },
    });
    if (recent) {
      return NextResponse.json({ ok: true, throttled: true });
    }

    const token = await createEmailVerificationToken(userId);
    const sent = await sendVerificationEmail({
      to: user.email,
      name: user.name,
      token,
    });

    return NextResponse.json(
      { ok: sent.ok, skipped: sent.skipped, error: sent.error },
      { status: sent.ok ? 200 : 502 }
    );
  } catch (e) {
    console.error("Send verification email error", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}