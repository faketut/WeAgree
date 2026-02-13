import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const protectedPaths = ["/dashboard", "/create", "/templates", "/settings"];

function isProtectedPath(pathname: string) {
  return protectedPaths.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const authingSession = request.cookies.get("authing_session")?.value;

  const isLoggedIn = !!user || !!authingSession;

  if (isProtectedPath(request.nextUrl.pathname) && !isLoggedIn) {
    const redirect = new URL("/login", request.url);
    redirect.searchParams.set("redirectTo", request.nextUrl.pathname);
    return NextResponse.redirect(redirect);
  }

  if (request.nextUrl.pathname === "/login" && isLoggedIn) {
    const redirectTo = request.nextUrl.searchParams.get("redirectTo") || "/dashboard";
    const redirectResponse = NextResponse.redirect(new URL(redirectTo, request.url));
    response.cookies.getAll().forEach((c) => redirectResponse.cookies.set(c.name, c.value));
    return redirectResponse;
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
