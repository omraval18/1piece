import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

function fromDashboard(pathname: string): string | null {
  if (pathname !== "/dashboard" && !pathname.startsWith("/dashboard/")) {
    return null;
  }
  const rest = pathname.slice("/dashboard".length) || "/";
  if (rest === "/") return "/";
  if (rest.startsWith("/chat/")) {
    const id = rest.slice("/chat/".length);
    return id ? `/${id}` : "/";
  }
  return rest;
}

export function proxy(request: NextRequest) {
  const relocated = fromDashboard(request.nextUrl.pathname);
  if (relocated) {
    return NextResponse.redirect(new URL(relocated, request.url));
  }

  const sessionCookie = getSessionCookie(request);
  if (!sessionCookie) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|sign-in|sign-up).*)",
  ],
};
