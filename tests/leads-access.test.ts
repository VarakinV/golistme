import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { PrismaClient } from "@prisma/client";

const session = vi.hoisted(() => ({ userId: null as string | null }));

vi.mock("@/lib/auth/auth", () => ({
  auth: async () => (session.userId ? { user: { id: session.userId } } : null),
}));

vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => undefined }),
}));

import * as leadsExportRoute from "@/app/api/leads/export/route";
import * as leadEmailRoute from "@/app/api/leads/[id]/email/route";
import * as qrStatsRoute from "@/app/api/qr/[id]/stats/route";


const prisma = new PrismaClient();
const stamp = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

let workspaceId: string;
let ownerId: string;
let adminlessUserId: string;
let viewerId: string;
let leadId: string;
let listingId: string;

function asUser(id: string | null) {
  session.userId = id;
}

function ctx(id: string) {
  return { params: Promise.resolve({ id }) };
}

function jsonRequest(path: string, body: unknown) {
  return new NextRequest(`http://localhost${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("leads permission enforcement", () => {
  beforeAll(async () => {
    const owner = await prisma.user.create({
      data: {
        email: `leads-owner-${stamp}@example.test`,
        password: "x",
        name: "Leads Owner",
        status: "ACTIVE",
      },
      select: { id: true },
    });
    const viewer = await prisma.user.create({
      data: {
        email: `leads-viewer-${stamp}@example.test`,
        password: "x",
        name: "Leads Viewer",
        status: "ACTIVE",
      },
      select: { id: true },
    });
    const noAccess = await prisma.user.create({
      data: {
        email: `leads-noaccess-${stamp}@example.test`,
        password: "x",
        name: "No Access",
        status: "ACTIVE",
      },
      select: { id: true },
    });
    ownerId = owner.id;
    adminlessUserId = noAccess.id;
    viewerId = viewer.id;

    const workspace = await prisma.realtorWorkspace.create({
      data: { slug: `leads-ws-${stamp}`, name: "Leads Workspace", ownerUserId: owner.id },
      select: { id: true },
    });
    workspaceId = workspace.id;

    await prisma.workspaceMembership.createMany({
      data: [
        {
          workspaceId,
          userId: owner.id,
          role: "OWNER",
          permissions: ["MANAGE_LISTINGS", "GENERATE_MARKETING", "VIEW_LEADS", "VIEW_ANALYTICS", "PURCHASE_CREDITS"],
          status: "ACTIVE",
        },
        {
          workspaceId,
          userId: viewer.id,
          role: "ASSISTANT",
          permissions: ["VIEW_LEADS"],
          status: "ACTIVE",
        },
        {
          workspaceId,
          userId: noAccess.id,
          role: "ASSISTANT",
          permissions: [],
          status: "ACTIVE",
        },
      ],
    });

    const listing = await prisma.listing.create({
      data: {
        realtorId: workspaceId,
        slug: `leads-listing-${stamp}`,
        propertyAddress: "10 Leads Way",
      },
      select: { id: true },
    });
    listingId = listing.id;

    const lead = await prisma.propertyInquiry.create({
      data: {
        workspaceId,
        orderId: listingId,
        name: "Jordan Buyer",
        email: `jordan-${stamp}@example.test`,
        phone: "555-0100",
        source: "BOOK_SHOWING",
        message: "Please show me this home",
      },
      select: { id: true },
    });
    leadId = lead.id;
  });

  afterAll(async () => {
    await prisma.realtorWorkspace.deleteMany({ where: { id: workspaceId } });
    await prisma.user.deleteMany({
      where: {
        id: {
          in: [ownerId, adminlessUserId, viewerId].filter(Boolean),
        },
      },
    });
    await prisma.$disconnect();
  });

  beforeEach(() => asUser(null));

  it("returns 401 when signed out", async () => {
    const res = await leadsExportRoute.GET(
      new NextRequest("http://localhost/api/leads/export")
    );
    expect(res.status).toBe(401);
  });

  it("blocks export without VIEW_LEADS", async () => {
    asUser(adminlessUserId);
    const res = await leadsExportRoute.GET(
      new NextRequest("http://localhost/api/leads/export")
    );
    expect(res.status).toBe(403);
  });

  it("exports only workspace leads with VIEW_LEADS", async () => {
    asUser(viewerId);
    const res = await leadsExportRoute.GET(
      new NextRequest("http://localhost/api/leads/export")
    );
    expect(res.status).toBe(200);
    const csv = await res.text();
    expect(csv).toContain("Jordan");
    expect(csv).toContain("BOOK_SHOWING");
    expect(csv).toContain("10 Leads Way");
  });

  it("blocks emailing a lead without VIEW_LEADS", async () => {
    asUser(adminlessUserId);
    const res = await leadEmailRoute.POST(
      jsonRequest(`/api/leads/${leadId}/email`, {
        subject: "Hello",
        message: "Hi there",
      }),
      ctx(leadId)
    );
    expect(res.status).toBe(403);
  });

  it("blocks QR stats without VIEW_LEADS or VIEW_ANALYTICS", async () => {
    asUser(adminlessUserId);
    const res = await qrStatsRoute.GET(
      new NextRequest(`http://localhost/api/qr/not-a-real-qr/stats`),
      ctx("not-a-real-qr")
    );
    expect(res.status).toBe(403);
  });
});