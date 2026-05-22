import { createServerClient } from "@supabase/ssr";
import type { CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getBaseUrlFromHeaders } from "@/lib/utils/baseUrl";

type CookieToSet = { name: string; value: string; options: CookieOptions };

const protectedPaths = ["/dashboard", "/create", "/templates", "/settings"];

function isProtectedPath(pathname: string) {
  return protectedPaths.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

export async function middleware(request: NextRequest) {
  try {
    const response = NextResponse.next({ request });

    const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/+$/, "");
    const supabasePublishableKey =
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabasePublishableKey) {
      return response;
    }

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
      const path = request.nextUrl.searchParams.get("redirectTo") || "/dashboard";
      const pathOnly = path.startsWith("/") ? path : `/${path}`;
      const origin = getBaseUrlFromHeaders(request.headers, new URL(request.url).origin);
      const redirectResponse = NextResponse.redirect(`${origin}${pathOnly}`);
      response.cookies.getAll().forEach((c) => redirectResponse.cookies.set(c.name, c.value));
      return redirectResponse;
    }

    return response;
  } catch {
    return NextResponse.next({ request });
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
