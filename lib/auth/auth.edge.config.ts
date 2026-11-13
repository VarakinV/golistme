import type { NextAuthConfig } from "next-auth";

// Edge-safe Auth.js config for proxy.ts only. Do NOT import providers or Node-only libs here.
const edgeAuthConfig = {
  secret: process.env.AUTH_SECRET,
  providers: [],
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const path = nextUrl.pathname;
      const user = auth?.user as any;
      const platformRole = user?.platformRole ?? (auth as any)?.token?.platformRole;
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
    jwt({ token, user, trigger, session }) {
      if (user) {
        const u = user as any;
        (token as any).id = u.id ?? (token as any).id;
        (token as any).platformRole = u.platformRole ?? (token as any).platformRole;
        (token as any).workspaceId = u.workspaceId ?? (token as any).workspaceId ?? null;
        (token as any).workspaceRole = u.workspaceRole ?? (token as any).workspaceRole ?? null;
        (token as any).permissions = u.permissions ?? (token as any).permissions ?? [];
        token.name = u.name ?? token.name;
        (token as any).avatarUrl = u.avatarUrl ?? u.image ?? (token as any).avatarUrl ?? null;
      }
      if (trigger === "update" && session) {
        // Only presentation fields are client-updatable.
        if (typeof (session as any).name === "string") token.name = (session as any).name;
        if ((session as any).avatarUrl !== undefined) (token as any).avatarUrl = (session as any).avatarUrl;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        const u = session.user as any;
        u.id = (token as any).id as string | undefined;
        u.platformRole = (token as any).platformRole as string | undefined;
        u.workspaceId = ((token as any).workspaceId as string | null | undefined) ?? null;
        u.workspaceRole = ((token as any).workspaceRole as string | null | undefined) ?? null;
        u.permissions = ((token as any).permissions as string[] | undefined) ?? [];
        session.user.name = token.name as string | null | undefined;
        u.avatarUrl = (token as any).avatarUrl as string | null | undefined;
      }
      return session;
    },
  },
  session: {
    strategy: "jwt",
  },
  trustHost: true,
} satisfies NextAuthConfig;

export default edgeAuthConfig;
