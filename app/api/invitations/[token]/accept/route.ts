import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db/prisma";
import { hashToken } from "@/lib/utils/invite";
import { hashPassword, validatePassword } from "@/lib/utils/password";
import { ACTIVE_WORKSPACE_COOKIE } from "@/lib/auth/workspace";

async function setActiveWorkspace(workspaceId: string) {
  const store = await cookies();
  store.set(ACTIVE_WORKSPACE_COOKIE, workspaceId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    const body = (await req.json().catch(() => ({}))) as {
      firstName?: string;
      lastName?: string;
      password?: string;
    };
    const firstName = (body.firstName || "").trim();
    const lastName = (body.lastName || "").trim();
    const password = body.password;

    const invite = await prisma.invitation.findUnique({
      where: { tokenHash: hashToken(token) },
      include: { workspace: { select: { id: true, name: true } } },
    });

    if (!invite) return NextResponse.json({ error: "Invalid invitation" }, { status: 404 });

    const existing = await prisma.user.findUnique({ where: { email: invite.email } });

    if (invite.status === "ACCEPTED" && invite.acceptedAt) {
      if (existing) {
        const membership = await prisma.workspaceMembership.findUnique({
          where: {
            workspaceId_userId: {
              workspaceId: invite.workspaceId,
              userId: existing.id,
            },
          },
          select: { status: true },
        });
        if (membership?.status === "ACTIVE") {
          await setActiveWorkspace(invite.workspaceId);
          return NextResponse.json(
            {
              message: "Invitation already accepted",
              alreadyAccepted: true,
              user: { id: existing.id, email: existing.email },
              workspace: invite.workspace,
            },
            { status: 200 }
          );
        }
      }
      return NextResponse.json({ error: "Invitation already used" }, { status: 409 });
    }

    if (invite.status !== "PENDING" || invite.acceptedAt) {
      return NextResponse.json({ error: "Invitation already used" }, { status: 409 });
    }
    if (invite.expiresAt < new Date()) {
      return NextResponse.json({ error: "Invitation expired" }, { status: 410 });
    }

    if (existing) {
      // Never let an invitation change an existing account's credentials or
      // reactivate a suspended/deleted account.
      if (existing.status !== "ACTIVE") {
        return NextResponse.json(
          { error: "This account cannot accept invitations. Contact support." },
          { status: 403 }
        );
      }

      const membership = await prisma.workspaceMembership.findUnique({
        where: { workspaceId_userId: { workspaceId: invite.workspaceId, userId: existing.id } },
        select: { status: true },
      });
      if (membership?.status === "ACTIVE") {
        await prisma.$transaction(async (tx) => {
          await tx.user.update({
            where: { id: existing.id },
            data: { lastActiveWorkspaceId: invite.workspaceId },
          });
          await tx.invitation.update({
            where: { id: invite.id },
            data: { status: "ACCEPTED", acceptedAt: new Date() },
          });
        });

        await setActiveWorkspace(invite.workspaceId);

        return NextResponse.json(
          {
            message: "Invitation accepted",
            alreadyMember: true,
            user: { id: existing.id, email: existing.email },
            workspace: invite.workspace,
          },
          { status: 200 }
        );
      }

      await prisma.$transaction(async (tx) => {
        await tx.workspaceMembership.upsert({
          where: {
            workspaceId_userId: { workspaceId: invite.workspaceId, userId: existing.id },
          },
          update: {
            role: invite.role,
            permissions: invite.permissions,
            status: "ACTIVE",
            invitedByUserId: invite.invitedById,
          },
          create: {
            workspaceId: invite.workspaceId,
            userId: existing.id,
            role: invite.role,
            permissions: invite.permissions,
            status: "ACTIVE",
            invitedByUserId: invite.invitedById,
          },
        });

        await tx.invitation.update({
          where: { id: invite.id },
          data: { status: "ACCEPTED", acceptedAt: new Date() },
        });

        await tx.user.update({
          where: { id: existing.id },
          data: { lastActiveWorkspaceId: invite.workspaceId },
        });
      });

      await setActiveWorkspace(invite.workspaceId);

      return NextResponse.json(
        {
          message: "Invitation accepted. Sign in with your existing credentials.",
          requiresSignIn: true,
          user: { id: existing.id, email: existing.email },
          workspace: invite.workspace,
        },
        { status: 200 }
      );
    }

    if (!firstName || !lastName) {
      return NextResponse.json(
        { error: "First name and last name are required" },
        { status: 400 }
      );
    }

    if (!password) {
      return NextResponse.json({ error: "Password is required" }, { status: 400 });
    }
    const pw = validatePassword(password);
    if (!pw.isValid) {
      return NextResponse.json({ error: "Weak password", details: pw.errors }, { status: 400 });
    }

    const hashed = await hashPassword(password);

    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          email: invite.email,
          password: hashed,
          name: `${firstName} ${lastName}`.trim(),
          platformRole: "USER",
          status: "ACTIVE",
          emailVerified: new Date(),
          lastActiveWorkspaceId: invite.workspaceId,
        },
      });

      await tx.workspaceMembership.create({
        data: {
          workspaceId: invite.workspaceId,
          userId: created.id,
          role: invite.role,
          permissions: invite.permissions,
          status: "ACTIVE",
          invitedByUserId: invite.invitedById,
        },
      });

      await tx.invitation.update({
        where: { id: invite.id },
        data: { status: "ACCEPTED", acceptedAt: new Date() },
      });

      return created;
    });

    await setActiveWorkspace(invite.workspaceId);

    return NextResponse.json(
      {
        message: "Invitation accepted",
        user: { id: user.id, email: user.email },
        workspace: invite.workspace,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("Accept invitation error", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}