import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const session = vi.hoisted(() => ({
  userId: null as string | null,
  platformRole: "" as string,
}));

vi.mock("@/lib/auth/auth", () => ({
  auth: async () =>
    session.userId
      ? { user: { id: session.userId, platformRole: session.platformRole } }
      : null,
}));

import * as musicRoute from "@/app/api/admin/music/route";
import * as templatesRoute from "@/app/api/admin/templates/route";
import * as socialTemplatesRoute from "@/app/api/admin/social-templates/route";

function asUser(userId: string | null, platformRole: string) {
  session.userId = userId;
  session.platformRole = platformRole;
}

describe("admin platform role regression", () => {
  beforeAll(() => asUser(null, ""));
  afterAll(() => asUser(null, ""));

  it("lets ADMIN and SUPERADMIN read admin music tracks", async () => {
    for (const platformRole of ["ADMIN", "SUPERADMIN"]) {
      asUser("admin_1", platformRole);
      const res = await musicRoute.GET();
      expect(res.status).toBe(200);
    }
  });

  it("blocks USER from admin music tracks", async () => {
    asUser("user_1", "USER");
    const res = await musicRoute.GET();
    expect(res.status).toBe(401);
  });

  it("lets ADMIN and SUPERADMIN read video templates", async () => {
    for (const platformRole of ["ADMIN", "SUPERADMIN"]) {
      asUser("admin_1", platformRole);
      const res = await templatesRoute.GET();
      expect(res.status).toBe(200);
    }
  });

  it("blocks USER from video templates", async () => {
    asUser("user_1", "USER");
    const res = await templatesRoute.GET();
    expect(res.status).toBe(401);
  });

  it("lets ADMIN and SUPERADMIN read social templates", async () => {
    for (const platformRole of ["ADMIN", "SUPERADMIN"]) {
      asUser("admin_1", platformRole);
      const res = await socialTemplatesRoute.GET(new NextRequest("http://localhost/api/admin/social-templates"));
      expect(res.status).toBe(200);
    }
  });

  it("blocks USER from social templates", async () => {
    asUser("user_1", "USER");
    const res = await socialTemplatesRoute.GET(new NextRequest("http://localhost/api/admin/social-templates"));
    expect(res.status).toBe(403);
  });

  it("rejects unauthenticated requests", async () => {
    asUser(null, "");
    const res = await musicRoute.GET();
    expect(res.status).toBe(401);
  });
});
