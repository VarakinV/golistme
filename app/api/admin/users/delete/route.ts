import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";
import { deleteListingCompletely } from "@/lib/listings/delete";
import { deleteFromS3 } from "@/lib/utils/s3";

export async function POST(request: Request) {
  try {
    const session = await auth();
    const me = session?.user as any | null;
    if (!me || me.platformRole !== "SUPERADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const userId = String(body?.userId || "");
    if (!userId) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    if (userId === me.id) return NextResponse.json({ error: "Cannot delete yourself" }, { status: 400 });

    const target = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        platformRole: true,
        avatarUrl: true,
        image: true,
      },
    });
    if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });
    if (target.platformRole === "SUPERADMIN") {
      return NextResponse.json({ error: "Cannot delete SUPERADMIN" }, { status: 400 });
    }

    // Delete every listing owned by this user's workspaces, including S3
    // assets. QR codes and printables are intentionally preserved.
    const ownedWorkspaces = await prisma.realtorWorkspace.findMany({
      where: { ownerUserId: userId },
      select: { id: true, headshot: true, companyLogo: true },
    });
    const workspaceIds = ownedWorkspaces.map((workspace) => workspace.id);

    if (workspaceIds.length > 0) {
      const listings = await prisma.listing.findMany({
        where: { realtorId: { in: workspaceIds } },
        select: { id: true },
      });
      for (const listing of listings) {
        await deleteListingCompletely(listing.id);
      }
    }

    // Remove profile images owned by the user. The workspace branding fields
    // are cleared in the transaction below so they do not point at deleted S3
    // objects.
    for (const workspace of ownedWorkspaces) {
      if (workspace.headshot) {
        await deleteFromS3(workspace.headshot);
      }
      if (workspace.companyLogo) {
        await deleteFromS3(workspace.companyLogo);
      }
    }
    if (target.avatarUrl) {
      await deleteFromS3(target.avatarUrl);
    }
    if (target.image && target.image !== target.avatarUrl) {
      await deleteFromS3(target.image);
    }

    await prisma.$transaction([
      prisma.realtorWorkspace.updateMany({
        where: { ownerUserId: userId },
        data: {
          ownerUserId: me.id,
          headshot: null,
          companyLogo: null,
        },
      }),
      prisma.invitation.updateMany({
        where: { invitedById: userId },
        data: { invitedById: me.id },
      }),
      prisma.payment.updateMany({
        where: { initiatedByUserId: userId },
        data: { initiatedByUserId: me.id },
      }),
      prisma.qRCode.updateMany({
        where: { createdByUserId: userId },
        data: { createdByUserId: me.id },
      }),
      prisma.user.delete({ where: { id: userId } }),
    ]);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Delete user error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}