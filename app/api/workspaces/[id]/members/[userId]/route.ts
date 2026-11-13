import { NextRequest, NextResponse } from "next/server";
import type { Permission } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { PERMISSION_ORDER } from "@/lib/config/credits";
import {
  getAuthContext,
  isPlatformAdmin,
  requireWorkspaceMember,
  WorkspaceAccessError,
} from "@/lib/auth/workspace";

function isPermission(value: unknown): value is Permission {
  return typeof value === "string" && (PERMISSION_ORDER as string[]).includes(value);
}

async function authorize(workspaceId: string) {
  const ctx = await getAuthContext();
  if (!ctx) throw new WorkspaceAccessError("Unauthorized", 401);

  const membership = await requireWorkspaceMember(ctx, workspaceId);
  if (!isPlatformAdmin(ctx) && membership.role !== "OWNER") {
    throw new WorkspaceAccessError("Only the workspace owner can manage members", 403);
  }
  return ctx;
}

function errorResponse(e: unknown, fallback: string) {
  if (e instanceof WorkspaceAccessError) {
    return NextResponse.json({ error: e.message }, { status: e.status });
  }
  console.error(e);
  return NextResponse.json({ error: fallback }, { status: 500 });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  try {
    const { id, userId } = await params;
    await authorize(id);

    const body = (await request.json().catch(() => ({}))) as {
      permissions?: unknown;
    };
    if (!Array.isArray(body.permissions)) {
      return NextResponse.json({ error: "permissions must be an array" }, { status: 400 });
    }

    const permissions = body.permissions.filter(isPermission);

    const target = await prisma.workspaceMembership.findUnique({
      where: { workspaceId_userId: { workspaceId: id, userId } },
      select: { id: true, role: true, status: true },
    });
    if (!target || target.status !== "ACTIVE") {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }
    if (target.role !== "ASSISTANT") {
      return NextResponse.json(
        { error: "Only assistant permissions can be changed" },
        { status: 400 }
      );
    }

    const updated = await prisma.workspaceMembership.update({
      where: { id: target.id },
      data: { permissions },
      select: { userId: true, role: true, permissions: true },
    });

    return NextResponse.json({ ok: true, member: updated });
  } catch (e) {
    return errorResponse(e, "Failed to update member");
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  try {
    const { id, userId } = await params;
    await authorize(id);

    const target = await prisma.workspaceMembership.findUnique({
      where: { workspaceId_userId: { workspaceId: id, userId } },
      select: { id: true, role: true },
    });
    if (!target) return NextResponse.json({ error: "Member not found" }, { status: 404 });
    if (target.role !== "ASSISTANT") {
      return NextResponse.json(
        { error: "The workspace owner cannot be removed" },
        { status: 400 }
      );
    }

    await prisma.workspaceMembership.delete({ where: { id: target.id } });

    return NextResponse.json({ ok: true });
  } catch (e) {
    return errorResponse(e, "Failed to remove member");
  }
}