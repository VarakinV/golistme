import type { NextAuthConfig } from "next-auth";
import { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import Email from "next-auth/providers/email";
import { PrismaAdapter } from "@auth/prisma-adapter";
import type { Adapter, AdapterUser } from "next-auth/adapters";
import { hashPassword } from "@/lib/utils/password";
import { randomBytes } from "crypto";

import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { verifyPassword } from "@/lib/utils/password";
import { Resend } from "resend";

import { verifyRecaptchaServer } from "@/lib/recaptcha/verify";

const BRAND = process.env.BRAND_NAME ?? "GoList.me";
const FROM = process.env.RESEND_FROM || `${BRAND} <onboarding@resend.dev>`;

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, "Password is required"),
});

class AccountSuspendedError extends CredentialsSignin {
  code = "account_suspended";
}

// Adapter override: auto-provision users only from a valid workspace invitation.
const baseAdapter = PrismaAdapter(prisma) as unknown as Adapter;
const adapter: Adapter = {
  ...baseAdapter,
  async createUser(data) {
    const email = (data?.email ?? "").trim().toLowerCase();
    if (!email) throw new Error("MissingEmail");

    const invite = await prisma.invitation.findFirst({
      where: { email, status: "PENDING", expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
    });

    if (!invite) {
      // Do not create unknown users via Magic Link.
      throw new Error("AutoProvisionNotAllowed");
    }

    const password = await hashPassword(randomBytes(16).toString("hex"));

    const created = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          password,
          name: (data as { name?: string | null })?.name ?? null,
          emailVerified: new Date(),
        },
      });

      await tx.workspaceMembership.create({
        data: {
          workspaceId: invite.workspaceId,
          userId: user.id,
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

      return user;
    });

    // Extra claims are consumed by the jwt callback on first sign-in.
    return {
      id: created.id,
      email: created.email,
      emailVerified: created.emailVerified,
      name: created.name ?? null,
      image: created.image ?? null,
      platformRole: created.platformRole,
      workspaceId: invite.workspaceId,
      workspaceRole: invite.role,
      permissions: invite.permissions,
    } as unknown as AdapterUser;
  },
};

export default {
  secret: process.env.AUTH_SECRET,
  adapter: adapter as any,
  providers: [
    Email({
      from: FROM,
      maxAge: 15 * 60,
      normalizeIdentifier(identifier) {
        return identifier.trim().toLowerCase();
      },
      // Nodemailer is not used; Resend sends the message.
      server: {} as any,
      async sendVerificationRequest({ identifier, url }) {
        try {
          const email = identifier.trim().toLowerCase();

          try {
            const { cookies } = await import("next/headers");
            const cookieStore = await cookies();
            const token = cookieStore.get("recaptcha_v3_token")?.value;
            const recaptcha = await verifyRecaptchaServer(token, "magic_link");
            if (!recaptcha.ok) return;
          } catch {
            // headers() is unavailable in some contexts; verification fails open without env.
          }

          // Allow-list: active existing users and valid workspace invitations only.
          const user = await prisma.user.findUnique({ where: { email } });
          if (user && user.status !== "ACTIVE") return;

          const invite = await prisma.invitation.findFirst({
            where: { email, status: "PENDING", expiresAt: { gt: new Date() } },
          });
          if (!user && !invite) return;

          const resend = new Resend(process.env.RESEND_API_KEY!);
          const original = new URL(url);
          const safeUrl = `${original.origin}/auth/email?next=${encodeURIComponent(url)}`;

          await resend.emails.send({
            from: FROM,
            to: email,
            subject: `Your sign-in link for ${BRAND}`,
            html: `
              <div style="font-family:Arial,Helvetica,sans-serif;line-height:1.6">
                <h2 style="margin:0 0 12px">Sign in to ${BRAND}</h2>
                <p>Click the button below to sign in. This link expires in 15 minutes and can be used once.</p>
                <p style="margin:16px 0">
                  <a href="${safeUrl}" style="display:inline-block;background:#111827;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none">Sign in</a>
                </p>
                <p>Or copy and paste this link into your browser:</p>
                <p style="word-break:break-all;color:#4b5563">${safeUrl}</p>
                <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0" />
                <p style="color:#6b7280;font-size:12px">If you didn’t request this email, you can safely ignore it.</p>
              </div>
            `,
          });
        } catch (err) {
          console.error("sendVerificationRequest error", err);
        }
      },
    }),
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const validatedFields = loginSchema.safeParse(credentials);
        if (!validatedFields.success) return null;

        const email = validatedFields.data.email.trim().toLowerCase();
        const { password } = validatedFields.data;

        try {
          const recaptchaToken = (credentials as any)?.recaptchaToken as string | undefined;
          const recaptcha = await verifyRecaptchaServer(recaptchaToken, "login");
          if (!recaptcha.ok) {
            console.warn("[auth] reCAPTCHA rejected login", {
              error: recaptcha.error,
              action: recaptcha.action,
              score: recaptcha.score,
            });
            return null;
          }

          const user = await prisma.user.findFirst({
            where: { email: { equals: email, mode: "insensitive" } },
            include: {
              memberships: {
                where: { status: "ACTIVE" },
                orderBy: { createdAt: "asc" },
                take: 1,
              },
            },
          });

          if (!user || !user.password) return null;
          if (user.status !== "ACTIVE") {
            throw new AccountSuspendedError();
          }

          const passwordsMatch = await verifyPassword(password, user.password);
          if (!passwordsMatch) return null;

          const membership = user.memberships[0];

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.image,
            avatarUrl: user.avatarUrl ?? user.image ?? null,
            platformRole: user.platformRole,
            workspaceId: membership?.workspaceId ?? null,
            workspaceRole: membership?.role ?? null,
            permissions: membership?.permissions ?? [],
          } as any;
        } catch (error) {
          if (error instanceof AccountSuspendedError) throw error;
          console.error("Auth error:", error);
          return null;
        }
      },
    }),
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
      allowDangerousEmailAccountLinking: true,
      authorization: {
        params: {
          access_type: "offline",
          prompt: "consent",
          include_granted_scopes: "true",
          scope: "openid email profile",
        },
      },
    }),
  ],
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    async signIn({ user }) {
      // Enforce account status for every provider (credentials, magic link, Google).
      const userId = (user as { id?: string })?.id;
      if (!userId) return true;
      const dbUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { status: true },
      });
      return dbUser?.status === "ACTIVE";
    },
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const path = nextUrl.pathname;
      const user = auth?.user as any;
      const platformRole = user?.platformRole;
      if (path.startsWith("/admin")) {
        return isLoggedIn && (platformRole === "ADMIN" || platformRole === "SUPERADMIN");
      }

      if (path.startsWith("/portal")) {
        return isLoggedIn;
      }

      if (path.startsWith("/my-profile")) {
        return isLoggedIn;
      }

      return true;
    },
    redirect({ url, baseUrl }) {
      try {
        if (url.startsWith("/")) return `${baseUrl}${url}`;
        const u = new URL(url);
        if (u.origin === baseUrl) return url;
        return baseUrl;
      } catch {
        return baseUrl;
      }
    },
    async jwt({ token, user, trigger, session }) {
      if (user) {
        const u = user as any;
        token.id = u.id;
        (token as any).platformRole = u.platformRole;
        (token as any).workspaceId = u.workspaceId ?? null;
        (token as any).workspaceRole = u.workspaceRole ?? null;
        (token as any).permissions = u.permissions ?? [];
        token.name = u.name ?? token.name;
        (token as any).avatarUrl = u.avatarUrl ?? u.image ?? (token as any).avatarUrl ?? null;
      }
      if (trigger === "update" && session) {
        // Only presentation fields are client-updatable. Role, workspace, and
        // permissions must never be accepted from the client.
        if (typeof (session as any).name === "string") token.name = (session as any).name;
        if ((session as any).avatarUrl !== undefined) (token as any).avatarUrl = (session as any).avatarUrl;
      }

      // Refresh tokens issued before workspace claims existed (or before an
      // invited assistant accepted a workspace).
      const needsWorkspace =
        !(token as any).workspaceId &&
        ((token as any).platformRole === "USER" || !(token as any).platformRole);

      if (!user && token.id && needsWorkspace) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: {
            platformRole: true,
            memberships: {
              where: { status: "ACTIVE" },
              orderBy: { createdAt: "asc" },
              take: 1,
              select: { workspaceId: true, role: true, permissions: true },
            },
          },
        });

        if (dbUser) {
          const membership = dbUser.memberships[0] ?? null;
          (token as any).platformRole = dbUser.platformRole;
          (token as any).workspaceId = membership?.workspaceId ?? null;
          (token as any).workspaceRole = membership?.role ?? null;
          (token as any).permissions = membership?.permissions ?? [];
        }
      }

      return token;
    },
    session({ session, token }) {
      if (session.user) {
        const u = session.user as any;
        u.id = token.id as string;
        u.platformRole = (token as any).platformRole;
        u.workspaceId = (token as any).workspaceId ?? null;
        u.workspaceRole = (token as any).workspaceRole ?? null;
        u.permissions = (token as any).permissions ?? [];
        session.user.name = token.name as string | null | undefined;
        u.avatarUrl = (token as any).avatarUrl as string | null | undefined;
      }
      return session;
    },
  },
  session: {
    strategy: "jwt",
    // Shorter sessions limit the window in which a suspended account keeps access.
    maxAge: 12 * 60 * 60,
  },
  trustHost: true,
} satisfies NextAuthConfig;
