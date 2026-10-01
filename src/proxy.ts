import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { decideAccess, isAppRole, STAFF_ROLES } from "@/lib/auth/access";
import type { Database } from "@/types/database";

/**
 * Proxy hanya untuk refresh session + redirect UX. Proteksi sesungguhnya ada
 * di guard server (src/lib/auth/guards.ts) dan RLS (pelajaran CVE-2025-29927).
 */
export async function proxy(request: NextRequest) {
  // Biteship webhook hanya menerima base URL — rewrite POST "/" ke handler.
  // Lewati bila ada header Next-Action (server action Next.js, bukan webhook).
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

  // PENTING: jangan sisipkan logika apa pun antara createServerClient dan getUser().
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  function redirectWithCookies(destination: string, searchParams?: Record<string, string>) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = destination;
    redirectUrl.search = "";
    if (searchParams) {
      Object.entries(searchParams).forEach(([key, value]) =>
        redirectUrl.searchParams.set(key, value),
      );
    }
    const res = NextResponse.redirect(redirectUrl);
    supabaseResponse.cookies
      .getAll()
      .forEach((cookie) => res.cookies.set(cookie.name, cookie.value, cookie));
    return res;
  }

  if (pathname.startsWith("/dashboard") && !user) {
    return redirectWithCookies("/login", { redirectTo: pathname });
  }

  const isAdminArea = pathname === "/admin" || pathname.startsWith("/admin/");
  const isAdminLogin = pathname === "/admin/login";
  const isAdminMfa = pathname === "/admin/mfa";

  if (isAdminArea) {
    if (!user) {
      return isAdminLogin ? supabaseResponse : redirectWithCookies("/admin/login");
    }

    const [{ data: profile }, { data: aalData }] = await Promise.all([
      supabase.from("profiles").select("role, is_blocked").eq("id", user.id).maybeSingle(),
      supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
    ]);

    const decision = decideAccess(
      {
        authenticated: true,
        role: profile && isAppRole(profile.role) ? profile.role : null,
        isBlocked: profile?.is_blocked ?? false,
        aal: aalData?.currentLevel === "aal2" ? "aal2" : "aal1",
      },
      STAFF_ROLES,
    );

    if (decision.ok) {
      return isAdminLogin || isAdminMfa ? redirectWithCookies("/admin") : supabaseResponse;
    }
    if (decision.reason === "mfa_required") {
      return isAdminMfa ? supabaseResponse : redirectWithCookies("/admin/mfa");
    }
    // Bukan staf / diblokir: hanya halaman login staf yang boleh dibuka.
    if (isAdminLogin) return supabaseResponse;
    return redirectWithCookies("/admin/login", {
      error: decision.reason === "blocked" ? "blocked" : "not_admin",
    });
  }

  return supabaseResponse;
}

export const config = {
  matcher: ["/", "/dashboard", "/dashboard/:path*", "/admin", "/admin/:path*"],
};
