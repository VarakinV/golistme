import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import {
  consumeEmailVerificationToken,
  createEmailVerificationToken,
  hashVerificationToken,
} from "@/lib/auth/email-verification";

const prisma = new PrismaClient();
const stamp = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
let userId = "";

beforeAll(async () => {
  const user = await prisma.user.create({
    data: {
      email: `verify-${stamp}@example.test`,
      password: "not-a-real-hash",
      name: "Verification Test",
      platformRole: "USER",
      status: "ACTIVE",
      emailVerified: null,
    },
    select: { id: true },
  });
  userId = user.id;
});

afterAll(async () => {
  if (userId) {
    await prisma.user.deleteMany({ where: { id: userId } });
  }
  await prisma.$disconnect();
});

describe("email verification", () => {
  it("verifies a valid token exactly once", async () => {
    const token = await createEmailVerificationToken(userId);

    const result = await consumeEmailVerificationToken(token);
    expect(result?.userId).toBe(userId);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { emailVerified: true },
    });
    expect(user?.emailVerified).toBeTruthy();

    expect(await consumeEmailVerificationToken(token)).toBeNull();
  });

  it("rejects an expired token", async () => {
    const token = `expired-${stamp}`;
    await prisma.emailVerificationToken.create({
      data: {
        userId,
        tokenHash: hashVerificationToken(token),
        expiresAt: new Date(Date.now() - 1000),
      },
    });

    expect(await consumeEmailVerificationToken(token)).toBeNull();

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { emailVerified: true },
    });
    expect(user?.emailVerified).toBeTruthy();
  });

  it("rejects an unknown token", async () => {
    expect(await consumeEmailVerificationToken(`unknown-${stamp}`)).toBeNull();
  });
});