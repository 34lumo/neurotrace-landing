import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "./lib/supabase/middleware";

function isProtectedRoute(pathname: string): boolean {
  return (
    pathname === "/game" ||
    pathname.startsWith("/game/") ||
    pathname === "/dashboard" ||
    pathname.startsWith("/dashboard/")
  );
}

function redirectWithSessionCookies(
  sessionResponse: NextResponse,
  target: URL,
): NextResponse {
  const redirect = NextResponse.redirect(target);
  const cookies = sessionResponse.cookies.getAll();
  cookies.forEach(({ name, value }) => {
    redirect.cookies.set(name, value);
  });
  return redirect;
}

export async function middleware(request: NextRequest) {
  const { response, user } = await updateSession(request);
  const pathname = request.nextUrl.pathname;

  if (!user && isProtectedRoute(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return redirectWithSessionCookies(response, url);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
