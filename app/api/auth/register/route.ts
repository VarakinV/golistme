import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { hashPassword, validatePassword } from "@/lib/utils/password";
import { verifyRecaptchaServer } from "@/lib/recaptcha/verify";
import { createWorkspaceForUserTx } from "@/lib/workspaces/create";
import {
  createEmailVerificationToken,
  sendVerificationEmail,
} from "@/lib/auth/email-verification";

const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  companyName: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const recaptchaToken = (body as any)?.recaptchaToken as string | undefined;
    const recaptcha = await verifyRecaptchaServer(recaptchaToken, "register");
    if (!recaptcha.ok) {
      return NextResponse.json({ error: "reCAPTCHA failed" }, { status: 400 });
    }

    const validatedFields = registerSchema.safeParse(body);
    if (!validatedFields.success) {
      return NextResponse.json(
        { error: "Invalid fields", details: validatedFields.error.flatten() },
        { status: 400 }
      );
    }

    const email = validatedFields.data.email.trim().toLowerCase();
    const { password, firstName, lastName, companyName } = validatedFields.data;
    const displayName = `${firstName} ${lastName}`.trim();

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      return NextResponse.json(
        { error: "Weak password", details: passwordValidation.errors },
        { status: 400 }
      );
    }

    const existingUser = await prisma.user.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
    });
    if (existingUser) {
      return NextResponse.json(
        { error: "User already exists with this email" },
        { status: 409 }
      );
    }

    const hashedPassword = await hashPassword(password);

    const { user, workspace } = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          email,
          password: hashedPassword,
          name: displayName,
          platformRole: "USER",
          status: "ACTIVE",
        },
        select: { id: true, email: true, name: true, platformRole: true },
      });

      const createdWorkspace = await createWorkspaceForUserTx(tx, {
        userId: created.id,
        name: displayName,
        email,
        firstName,
        lastName,
        companyName: companyName ?? null,
      });

      return { user: created, workspace: createdWorkspace };
    });

    let verificationEmailSent = false;
    try {
      const token = await createEmailVerificationToken(user.id);
      const sent = await sendVerificationEmail({
        to: user.email,
        name: user.name,
        token,
      });
      verificationEmailSent = sent.ok;
    } catch (e) {
      console.error("Verification email error:", e);
    }

    return NextResponse.json(
      {
        message: "User created successfully",
        user,
        workspace: { id: workspace.id, slug: workspace.slug, name: workspace.name },
        verificationEmailSent,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
