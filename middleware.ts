import { createServerClient } from "@supabase/ssr";
import type { CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

type CookieToSet = { name: string; value: string; options: CookieOptions };

const protectedPaths = ["/dashboard", "/create", "/templates", "/settings"];

function isProtectedPath(pathname: string) {
  return protectedPaths.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabasePublishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabasePublishableKey) {
    return response;
  }

  try {
    const supabase = createServerClient(supabaseUrl, supabasePublishableKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    });

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (isProtectedPath(request.nextUrl.pathname) && !user) {
      const redirect = new URL("/login", request.url);
      redirect.searchParams.set("redirectTo", request.nextUrl.pathname);
      return NextResponse.redirect(redirect);
    }

    if (request.nextUrl.pathname === "/login" && user) {
      const redirectTo = request.nextUrl.searchParams.get("redirectTo") || "/dashboard";
      const redirectResponse = NextResponse.redirect(new URL(redirectTo, request.url));
      response.cookies.getAll().forEach((c) => redirectResponse.cookies.set(c.name, c.value));
      return redirectResponse;
    }
  } catch {
    return response;
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
