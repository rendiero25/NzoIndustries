import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import type { Database } from "@/types/supabase";

export async function proxy(request: NextRequest) {
  // Biteship webhook only accepts base URL — rewrite POST "/" to our handler.
  // Skip if Next-Action header is present (Next.js server action, not a Biteship webhook).
  if (
    request.method === "POST" &&
    request.nextUrl.pathname === "/" &&
    !request.headers.get("Next-Action")
  ) {
    return NextResponse.rewrite(new URL("/api/webhooks/biteship", request.url));
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // PENTING: Jangan letakkan logic apapun antara createServerClient dan getUser()
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  function redirectWithCookies(destination: string, searchParams?: Record<string, string>) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = destination;
    redirectUrl.search = "";
    if (searchParams) {
      Object.entries(searchParams).forEach(([key, value]) => {
        redirectUrl.searchParams.set(key, value);
      });
    }
    const res = NextResponse.redirect(redirectUrl);
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      res.cookies.set(cookie.name, cookie.value, cookie);
    });
    return res;
  }

  // ─── /dashboard/* — wajib login ──────────────────────────────────────────────
  if (pathname.startsWith("/dashboard")) {
    if (!user) {
      return redirectWithCookies("/login", { redirectTo: pathname });
    }
  }

  // ─── /admin/* — wajib login + role admin ─────────────────────────────────────
  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
    if (!user) {
      return redirectWithCookies("/admin/login");
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin") {
      return redirectWithCookies("/admin/login", { error: "not_admin" });
    }
  }

  // ─── /admin/login — redirect ke /admin jika sudah login sebagai admin ────────
  if (pathname === "/admin/login" && user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role === "admin") {
      return redirectWithCookies("/admin");
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: ["/", "/dashboard", "/dashboard/:path*", "/admin", "/admin/:path*"],
};
