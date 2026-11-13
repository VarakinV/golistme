import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { consumeEmailVerificationToken } from "@/lib/auth/email-verification";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token") || "";
  const result = await consumeEmailVerificationToken(token);
  const session = await auth();

  if (!result) {
    return NextResponse.redirect(new URL("/verify-email?error=invalid", req.url));
  }

  return NextResponse.redirect(
    new URL(session?.user ? "/portal?verified=1" : "/login?verified=1", req.url)
  );
}