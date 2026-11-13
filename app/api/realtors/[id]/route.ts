import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";
import { deleteFromS3 } from "@/lib/utils/s3";
import {
  getAuthContext,
  isPlatformAdmin,
  requireWorkspaceMember,
  WorkspaceAccessError,
} from "@/lib/auth/workspace";

const updateWorkspaceSchema = z.object({
  name: z.preprocess((v) => (v === "" ? undefined : v), z.string().optional()),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.preprocess((v) => (v === "" ? undefined : v), z.string().optional().nullable()),
  headshot: z.string().url().optional().nullable(),
  companyName: z.string().optional().nullable(),
  companyLogo: z.string().url().optional().nullable(),
  facebookUrl: z.preprocess((v) => (v === "" ? undefined : v), z.string().url().optional().nullable()),
  linkedinUrl: z.preprocess((v) => (v === "" ? undefined : v), z.string().url().optional().nullable()),
  instagramUrl: z.preprocess((v) => (v === "" ? undefined : v), z.string().url().optional().nullable()),
  youtubeUrl: z.preprocess((v) => (v === "" ? undefined : v), z.string().url().optional().nullable()),
  twitterUrl: z.preprocess((v) => (v === "" ? undefined : v), z.string().url().optional().nullable()),
  pinterestUrl: z.preprocess((v) => (v === "" ? undefined : v), z.string().url().optional().nullable()),
  vimeoUrl: z.preprocess((v) => (v === "" ? undefined : v), z.string().url().optional().nullable()),
  tiktokUrl: z.preprocess((v) => (v === "" ? undefined : v), z.string().url().optional().nullable()),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await getAuthContext();
    if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    await requireWorkspaceMember(ctx, id);

    const workspace = await prisma.realtorWorkspace.findUnique({
      where: { id },
      include: {
        memberships: {
          where: { status: "ACTIVE" },
          include: { user: { select: { id: true, email: true, name: true } } },
        },
        creditBalance: true,
      },
    });

    if (!workspace) return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    return NextResponse.json(workspace);
  } catch (error) {
    if (error instanceof WorkspaceAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Error fetching workspace:", error);
    return NextResponse.json({ error: "Failed to fetch workspace" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await getAuthContext();
    if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const membership = await requireWorkspaceMember(ctx, id);
    if (!isPlatformAdmin(ctx) && membership.role !== "OWNER") {
      return NextResponse.json({ error: "Only the workspace owner can edit it" }, { status: 403 });
    }

    const body = await request.json();
    const validated = updateWorkspaceSchema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json(
        { error: "Invalid fields", details: validated.error.flatten() },
        { status: 400 }
      );
    }

    const data = validated.data;

    const existing = await prisma.realtorWorkspace.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Workspace not found" }, { status: 404 });

    if (existing.headshot && existing.headshot !== data.headshot) {
      await deleteFromS3(existing.headshot);
    }
    if (existing.companyLogo && existing.companyLogo !== data.companyLogo) {
      await deleteFromS3(existing.companyLogo);
    }

    const updated = await prisma.realtorWorkspace.update({
      where: { id },
      data: {
        name: data.name || existing.name,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email.trim().toLowerCase(),
        phone: data.phone || null,
        headshot: data.headshot || null,
        companyName: data.companyName || null,
        companyLogo: data.companyLogo || null,
        facebookUrl: data.facebookUrl || null,
        linkedinUrl: data.linkedinUrl || null,
        instagramUrl: data.instagramUrl || null,
        youtubeUrl: data.youtubeUrl || null,
        twitterUrl: data.twitterUrl || null,
        pinterestUrl: data.pinterestUrl || null,
        vimeoUrl: data.vimeoUrl || null,
        tiktokUrl: data.tiktokUrl || null,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof WorkspaceAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Error updating workspace:", error);
    return NextResponse.json({ error: "Failed to update workspace" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await getAuthContext();
    if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const membership = await requireWorkspaceMember(ctx, id);
    if (!isPlatformAdmin(ctx) && membership.role !== "OWNER") {
      return NextResponse.json({ error: "Only the workspace owner can delete it" }, { status: 403 });
    }

    const workspace = await prisma.realtorWorkspace.findUnique({ where: { id } });
    if (!workspace) return NextResponse.json({ error: "Workspace not found" }, { status: 404 });

    const listingCount = await prisma.listing.count({ where: { realtorId: id } });
    if (listingCount > 0) {
      return NextResponse.json(
        {
          error: "Cannot delete a workspace with existing listings",
          details: [`This workspace has ${listingCount} listing(s). Delete or move them first.`],
        },
        { status: 409 }
      );
    }

    const headshotUrl = workspace.headshot;
    const companyLogoUrl = workspace.companyLogo;

    await prisma.realtorWorkspace.delete({ where: { id } });

    try {
      if (headshotUrl) await deleteFromS3(headshotUrl);
    } catch (e) {
      console.warn("Failed to delete headshot from S3", e);
    }
    try {
      if (companyLogoUrl) await deleteFromS3(companyLogoUrl);
    } catch (e) {
      console.warn("Failed to delete company logo from S3", e);
    }

    return NextResponse.json({ message: "Workspace deleted successfully" }, { status: 200 });
  } catch (error) {
    if (error instanceof WorkspaceAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Error deleting workspace:", error);
    return NextResponse.json({ error: "Failed to delete workspace" }, { status: 500 });
  }
}
