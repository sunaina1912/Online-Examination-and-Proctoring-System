import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl
    const role = req.nextauth.token?.role as string | undefined

    // Admin-only routes
    if (pathname.startsWith('/admin') && role === 'student') {
      // Students are allowed — they see their own dashboard view
      // Block nothing for now; page-level logic handles role diffs
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
    pages: {
      signIn: '/auth/login',
    },
  }
)

export const config = {
  matcher: [
    '/admin/:path*',
    '/exam/:path*',
  ],
}
