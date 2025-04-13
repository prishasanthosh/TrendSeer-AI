import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs"

export async function middleware(req: NextRequest) {
  // Create a Supabase client configured to use cookies
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })

  // Refresh session if expired - required for Server Components
  const {
    data: { session },
  } = await supabase.auth.getSession()

  // Check if this is the login page
  const isLoginPage = req.nextUrl.pathname === "/login"
  const isSignupPage = req.nextUrl.pathname === "/signup"
  const isForgotPasswordPage = req.nextUrl.pathname === "/forgot-password"
  const isAuthPage = isLoginPage || isSignupPage || isForgotPasswordPage

  // If on an auth page and already logged in, redirect to home
  if (isAuthPage && session) {
    return NextResponse.redirect(new URL("/", req.url))
  }

  // If not on an auth page and not logged in, redirect to login
  if (!isAuthPage && !session) {
    const redirectUrl = req.nextUrl.clone()
    redirectUrl.pathname = "/login"
    redirectUrl.searchParams.set("redirectedFrom", req.nextUrl.pathname)
    return NextResponse.redirect(redirectUrl)
  }

  return res
}

// Only run middleware on specific routes that need authentication
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - public files (e.g. robots.txt)
     */
    "/((?!_next/static|_next/image|favicon.ico|public/).*)",
  ],
}
