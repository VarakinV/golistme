import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { auth } from "@/lib/auth/auth";
import { generateInviteToken, sendInvitationEmail } from "@/lib/utils/invite";
import { ASSISTANT_DEFAULT_PERMISSIONS } from "@/lib/config/credits";

const inviteSchema = z.object({
  email: z.string().trim().email("Enter a valid email address"),
  workspaceId: z.string().min(1).optional(),
  role: z.literal("ASSISTANT").optional(),
  permissions: z
    .array(
      z.enum([
        "MANAGE_LISTINGS",
        "GENERATE_MARKETING",
        "VIEW_LEADS",
        "VIEW_ANALYTICS",
        "PURCHASE_CREDITS",
      ])
    )
    .optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const me = session?.user as any | null;
    if (!me?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const parsed = inviteSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid fields", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const workspaceId = parsed.data.workspaceId || (me.workspaceId as string | undefined);
    const email = parsed.data.email.toLowerCase();

    if (!workspaceId) {
      return NextResponse.json({ error: "workspaceId is required" }, { status: 400 });
    }

    const workspace = await prisma.realtorWorkspace.findUnique({ where: { id: workspaceId } });
    if (!workspace) return NextResponse.json({ error: "Workspace not found" }, { status: 404 });

    const isPlatformAdmin = me.platformRole === "ADMIN" || me.platformRole === "SUPERADMIN";
    if (!isPlatformAdmin) {
      const membership = await prisma.workspaceMembership.findUnique({
        where: { workspaceId_userId: { workspaceId, userId: me.id } },
        select: { role: true, status: true },
      });
      if (!membership || membership.status !== "ACTIVE" || membership.role !== "OWNER") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const existingUser = await prisma.user.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
    });
    if (existingUser) {
      if (existingUser.platformRole !== "USER") {
        return NextResponse.json(
          { error: "Privileged platform accounts cannot be invited to a workspace" },
          { status: 400 }
        );
      }
      const existingMembership = await prisma.workspaceMembership.findUnique({
        where: { workspaceId_userId: { workspaceId, userId: existingUser.id } },
        select: { status: true },
      });
      if (existingMembership?.status === "ACTIVE") {
        return NextResponse.json({ error: "User is already a member of this workspace" }, { status: 409 });
      }
    }

    const existingInvite = await prisma.invitation.findFirst({
      where: { workspaceId, email, status: "PENDING", expiresAt: { gt: new Date() } },
    });
    if (existingInvite) {
      return NextResponse.json({ error: "An invitation is already pending for this email" }, { status: 409 });
    }

    const role = "ASSISTANT" as const;
    const permissions = parsed.data.permissions ?? ASSISTANT_DEFAULT_PERMISSIONS;

    const { token, tokenHash, expiresAt } = generateInviteToken(7);

    const invite = await prisma.invitation.create({
      data: {
        email,
        workspaceId,
        role,
        permissions: [...permissions],
        tokenHash,
        status: "PENDING",
        expiresAt,
        invitedById: me.id,
      },
    });

    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      new URL("/", req.nextUrl).toString().replace(/\/$/, "");
    const acceptUrl = `${baseUrl}/invite/${token}`;

    await sendInvitationEmail({ email: invite.email, acceptUrl, workspaceName: workspace.name });

    return NextResponse.json({ message: "Invitation created", id: invite.id }, { status: 201 });
  } catch (err) {
    console.error("Create invitation error", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
