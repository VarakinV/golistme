import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";
import {
  getAuthContext,
  isPlatformAdmin,
  WorkspaceAccessError,
  ACTIVE_WORKSPACE_COOKIE,
} from "@/lib/auth/workspace";
import { createWorkspaceForUser } from "@/lib/workspaces/create";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const workspaceSchema = z.object({
  name: z.preprocess((v) => (v === "" ? undefined : v), z.string().optional()),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.preprocess((v) => (v === "" ? undefined : v), z.string().optional().nullable()),
  headshot: z.preprocess((v) => (v === "" ? undefined : v), z.string().url().optional().nullable()),
  companyName: z.preprocess((v) => (v === "" ? undefined : v), z.string().optional().nullable()),
  companyLogo: z.preprocess((v) => (v === "" ? undefined : v), z.string().url().optional().nullable()),
  facebookUrl: z.preprocess((v) => (v === "" ? undefined : v), z.string().url().optional().nullable()),
  linkedinUrl: z.preprocess((v) => (v === "" ? undefined : v), z.string().url().optional().nullable()),
  instagramUrl: z.preprocess((v) => (v === "" ? undefined : v), z.string().url().optional().nullable()),
  youtubeUrl: z.preprocess((v) => (v === "" ? undefined : v), z.string().url().optional().nullable()),
  twitterUrl: z.preprocess((v) => (v === "" ? undefined : v), z.string().url().optional().nullable()),
  pinterestUrl: z.preprocess((v) => (v === "" ? undefined : v), z.string().url().optional().nullable()),
  vimeoUrl: z.preprocess((v) => (v === "" ? undefined : v), z.string().url().optional().nullable()),
  tiktokUrl: z.preprocess((v) => (v === "" ? undefined : v), z.string().url().optional().nullable()),
});

export async function GET() {
  try {
    const ctx = await getAuthContext();
    if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const workspaces = isPlatformAdmin(ctx)
      ? await prisma.realtorWorkspace.findMany({ orderBy: { createdAt: "desc" }, take: 200 })
      : await prisma.realtorWorkspace.findMany({
          where: {
            memberships: { some: { userId: ctx.userId, status: "ACTIVE" } },
          },
          orderBy: { createdAt: "desc" },
          take: 200,
        });

    return NextResponse.json(workspaces);
  } catch (error) {
    console.error("Error fetching workspaces:", error);
    return NextResponse.json({ error: "Failed to fetch workspaces" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const ctx = await getAuthContext();
    if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const validated = workspaceSchema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json(
        { error: "Invalid fields", details: validated.error.flatten() },
        { status: 400 }
      );
    }

    const data = validated.data;
    const email = data.email.trim().toLowerCase();

    const workspace = await createWorkspaceForUser({
      userId: ctx.userId,
      name: data.name || data.companyName || `${data.firstName} ${data.lastName}`.trim(),
      email,
      firstName: data.firstName,
      lastName: data.lastName,
      companyName: data.companyName ?? null,
    });

    const updated = await prisma.realtorWorkspace.update({
      where: { id: workspace.id },
      data: {
        phone: data.phone || null,
        headshot: data.headshot || null,
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

    await prisma.user.update({
      where: { id: ctx.userId },
      data: { lastActiveWorkspaceId: workspace.id },
    });

    const store = await cookies();
    store.set(ACTIVE_WORKSPACE_COOKIE, workspace.id, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });

    return NextResponse.json(updated, { status: 201 });
  } catch (error) {
    if (error instanceof WorkspaceAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Error creating workspace:", error);
    return NextResponse.json({ error: "Failed to create workspace" }, { status: 500 });
  }
}
