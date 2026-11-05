import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return NextResponse.next({ request });

  let response = NextResponse.next({ request });
  type CookieToSet = {
    name: string;
    value: string;
    options?: {
      domain?: string;
      path?: string;
      expires?: Date;
      httpOnly?: boolean;
      maxAge?: number;
      sameSite?: boolean | "lax" | "strict" | "none";
      secure?: boolean;
      priority?: "low" | "medium" | "high";
      partitioned?: boolean;
    };
  };

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet: CookieToSet[]) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          if (options) response.cookies.set(name, value, options);
          else response.cookies.set(name, value);
        });
      },
    },
  });

  const { data: { user } } = await supabase.auth.getUser();
  const protectedPath = request.nextUrl.pathname.startsWith("/dashboard");
  const authPath = ["/login", "/signup"].includes(request.nextUrl.pathname);
  if (protectedPath && !user) {
    const destination = request.nextUrl.clone();
    destination.pathname = "/login";
    return NextResponse.redirect(destination);
  }
  if (authPath && user) {
    const destination = request.nextUrl.clone();
    destination.pathname = "/dashboard";
    return NextResponse.redirect(destination);
  }
  return response;
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };
