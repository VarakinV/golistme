import NextAuth from "next-auth";
import edgeAuthConfig from "@/lib/auth/auth.edge.config";

const { auth } = NextAuth(edgeAuthConfig);

export const proxy = auth;

export const config = {
  matcher: ["/admin/:path*", "/portal/:path*", "/my-profile"],
};
