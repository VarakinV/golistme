import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { PrismaClient, type Permission } from "@prisma/client";

const session = vi.hoisted(() => ({ userId: null as string | null }));

vi.mock("@/lib/auth/auth", () => ({
  auth: async () => (session.userId ? { user: { id: session.userId } } : null),
}));

vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => undefined }),
}));

import * as photosRoute from "@/app/api/orders/[id]/media/photos/route";
import * as photosReorderRoute from "@/app/api/orders/[id]/media/photos/reorder/route";
import * as embedsRoute from "@/app/api/orders/[id]/media/embeds/route";
import * as videosRoute from "@/app/api/orders/[id]/media/videos/route";
import * as floorplansRoute from "@/app/api/orders/[id]/media/floorplans/route";
import * as reelsRoute from "@/app/api/orders/[id]/reels/route";
import * as flyersRoute from "@/app/api/orders/[id]/flyers/route";
import * as socialPostsRoute from "@/app/api/orders/[id]/social-posts/route";

const ASSISTANT_DEFAULTS: Permission[] = [
  "MANAGE_LISTINGS",
  "GENERATE_MARKETING",
  "VIEW_LEADS",
  "VIEW_ANALYTICS",
];

const prisma = new PrismaClient();
const stamp = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

let ownerId: string;
let assistantId: string;
let readOnlyAssistantId: string;
let outsiderId: string;
let outsiderWorkspaceId: string;
let workspaceId: string;
let listingId: string;
let photoIds: string[];

function ctx(id: string) {
  return { params: Promise.resolve({ id }) };
}

function getRequest(path: string) {
  return new NextRequest(`http://localhost${path}`);
}

function jsonRequest(path: string, method: string, body: unknown) {
  return new NextRequest(`http://localhost${path}`, {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function asUser(userId: string | null) {
  session.userId = userId;
}

describe("assistant access to listing tabs (database)", () => {
  beforeAll(async () => {
    const owner = await prisma.user.create({
      data: {
        email: `tabs-owner-${stamp}@example.test`,
        password: "not-a-real-hash",
        name: "Tabs Owner",
        platformRole: "USER",
        status: "ACTIVE",
      },
      select: { id: true },
    });
    const assistant = await prisma.user.create({
      data: {
        email: `tabs-assistant-${stamp}@example.test`,
        password: "not-a-real-hash",
        name: "Tabs Assistant",
        platformRole: "USER",
        status: "ACTIVE",
      },
      select: { id: true },
    });
    const readOnly = await prisma.user.create({
      data: {
        email: `tabs-readonly-${stamp}@example.test`,
        password: "not-a-real-hash",
        name: "Tabs Read Only",
        platformRole: "USER",
        status: "ACTIVE",
      },
      select: { id: true },
    });
    const outsider = await prisma.user.create({
      data: {
        email: `tabs-outsider-${stamp}@example.test`,
        password: "not-a-real-hash",
        name: "Tabs Outsider",
        platformRole: "USER",
        status: "ACTIVE",
      },
      select: { id: true },
    });
    ownerId = owner.id;
    assistantId = assistant.id;
    readOnlyAssistantId = readOnly.id;
    outsiderId = outsider.id;

    const workspace = await prisma.realtorWorkspace.create({
      data: { slug: `tabs-ws-${stamp}`, name: "Tabs Workspace", ownerUserId: ownerId },
      select: { id: true },
    });
    workspaceId = workspace.id;

    const outsiderWorkspace = await prisma.realtorWorkspace.create({
      data: { slug: `tabs-outsider-ws-${stamp}`, name: "Outsider Workspace", ownerUserId: outsiderId },
      select: { id: true },
    });
    outsiderWorkspaceId = outsiderWorkspace.id;

    await prisma.workspaceMembership.createMany({
      data: [
        {
          workspaceId: outsiderWorkspaceId,
          userId: outsiderId,
          role: "OWNER",
          permissions: ["MANAGE_LISTINGS", "GENERATE_MARKETING", "VIEW_LEADS", "VIEW_ANALYTICS", "PURCHASE_CREDITS"],
          status: "ACTIVE",
        },
        {
          workspaceId,
          userId: ownerId,
          role: "OWNER",
          permissions: [
            "MANAGE_LISTINGS",
            "GENERATE_MARKETING",
            "VIEW_LEADS",
            "VIEW_ANALYTICS",
            "PURCHASE_CREDITS",
          ],
          status: "ACTIVE",
        },
        {
          workspaceId,
          userId: assistantId,
          role: "ASSISTANT",
          permissions: ASSISTANT_DEFAULTS,
          status: "ACTIVE",
        },
        {
          workspaceId,
          userId: readOnlyAssistantId,
          role: "ASSISTANT",
          permissions: ["VIEW_LEADS"],
          status: "ACTIVE",
        },
      ],
    });

    const listing = await prisma.listing.create({
      data: {
        realtorId: workspaceId,
        slug: `tabs-listing-${stamp}`,
        propertyAddress: "10 Tabs Way",
      },
      select: { id: true },
    });
    listingId = listing.id;

    await prisma.photo.createMany({
      data: [
        { orderId: listingId, url: `https://example.test/a-${stamp}.jpg`, filename: "a.jpg", sortOrder: 0 },
        { orderId: listingId, url: `https://example.test/b-${stamp}.jpg`, filename: "b.jpg", sortOrder: 1 },
      ],
    });
    const photos = await prisma.photo.findMany({
      where: { orderId: listingId },
      orderBy: { sortOrder: "asc" },
      select: { id: true },
    });
    photoIds = photos.map((p) => p.id);
  });

  afterAll(async () => {
    await prisma.realtorWorkspace.deleteMany({ where: { id: { in: [workspaceId, outsiderWorkspaceId].filter(Boolean) } } });
    await prisma.user.deleteMany({
      where: { id: { in: [ownerId, assistantId, readOnlyAssistantId, outsiderId].filter(Boolean) } },
    });
    await prisma.$disconnect();
  });

  beforeEach(() => {
    asUser(null);
  });

  it("lets an assistant load every listing tab", async () => {
    asUser(assistantId);
    const base = `/api/orders/${listingId}`;

    const responses = await Promise.all([
      photosRoute.GET(getRequest(`${base}/media/photos`), ctx(listingId)),
      videosRoute.GET(getRequest(`${base}/media/videos`), ctx(listingId)),
      floorplansRoute.GET(getRequest(`${base}/media/floorplans`), ctx(listingId)),
      embedsRoute.GET(getRequest(`${base}/media/embeds`), ctx(listingId)),
      reelsRoute.GET(getRequest(`${base}/reels`), ctx(listingId)),
      flyersRoute.GET(getRequest(`${base}/flyers`), ctx(listingId)),
      socialPostsRoute.GET(getRequest(`${base}/social-posts`), ctx(listingId)),
    ]);

    for (const res of responses) {
      expect(res.status).toBe(200);
    }
  });

  it("lets an assistant add and remove a 3D tour embed", async () => {
    asUser(assistantId);
    const path = `/api/orders/${listingId}/media/embeds`;

    const created = await embedsRoute.POST(
      jsonRequest(path, "POST", { title: "Tour", embedUrl: "https://example.test/tour" }),
      ctx(listingId)
    );
    expect(created.status).toBe(201);
    const embed = (await created.json()) as { id: string };

    const listed = await embedsRoute.GET(getRequest(path), ctx(listingId));
    const items = (await listed.json()) as Array<{ id: string }>;
    expect(items.map((i) => i.id)).toContain(embed.id);

    const removed = await embedsRoute.DELETE(
      jsonRequest(path, "DELETE", { ids: [embed.id] }),
      ctx(listingId)
    );
    expect(removed.status).toBe(200);
    expect(await prisma.embed.findUnique({ where: { id: embed.id } })).toBeNull();
  });

  it("lets an assistant reorder photos", async () => {
    asUser(assistantId);
    const reversed = [...photoIds].reverse();

    const res = await photosReorderRoute.POST(
      jsonRequest(`/api/orders/${listingId}/media/photos/reorder`, "POST", { ids: reversed }),
      ctx(listingId)
    );
    expect(res.status).toBe(200);

    const rows = await prisma.photo.findMany({
      where: { id: { in: photoIds } },
      select: { id: true, sortOrder: true },
    });
    const byId = new Map(rows.map((r) => [r.id, r.sortOrder]));
    expect(byId.get(reversed[0])).toBe(0);
    expect(byId.get(reversed[1])).toBe(1);
  });

  it("blocks a member without MANAGE_LISTINGS from changing media", async () => {
    asUser(readOnlyAssistantId);
    const path = `/api/orders/${listingId}/media/embeds`;

    const embed = await embedsRoute.POST(
      jsonRequest(path, "POST", { title: "Nope", embedUrl: "https://example.test/nope" }),
      ctx(listingId)
    );
    expect(embed.status).toBe(403);

    const reorder = await photosReorderRoute.POST(
      jsonRequest(`/api/orders/${listingId}/media/photos/reorder`, "POST", { ids: photoIds }),
      ctx(listingId)
    );
    expect(reorder.status).toBe(403);
  });

  it("hides the listing from a user who belongs to another workspace", async () => {
    asUser(outsiderId);

    const photos = await photosRoute.GET(
      getRequest(`/api/orders/${listingId}/media/photos`),
      ctx(listingId)
    );
    expect(photos.status).toBe(404);

    const embeds = await embedsRoute.GET(
      getRequest(`/api/orders/${listingId}/media/embeds`),
      ctx(listingId)
    );
    expect(embeds.status).toBe(404);
  });

  it("rejects unauthenticated requests", async () => {
    asUser(null);
    const res = await embedsRoute.GET(
      getRequest(`/api/orders/${listingId}/media/embeds`),
      ctx(listingId)
    );
    expect(res.status).toBe(401);
  });
});
