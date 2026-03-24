import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

const ADMIN_EMAILS = [
  'jeehoon0310@gmail.com',
  'frindlelab@gmail.com',
  'jihoon.park@dplanex.com',
]

function getExternalUrl(request: NextRequest, pathname: string, searchParams?: Record<string, string>): URL {
  const forwardedHost = request.headers.get('x-forwarded-host')
  const forwardedProto = request.headers.get('x-forwarded-proto') || 'https'

  const url = request.nextUrl.clone()
  url.pathname = pathname
  if (searchParams) {
    Object.entries(searchParams).forEach(([k, v]) => url.searchParams.set(k, v))
  }
  if (forwardedHost) {
    url.host = forwardedHost
    url.protocol = forwardedProto
    url.port = ''
  }
  return url
}

export async function middleware(request: NextRequest) {
  const { user, supabaseResponse } = await updateSession(request)

  if (request.nextUrl.pathname.startsWith('/admin') &&
      !request.nextUrl.pathname.startsWith('/admin/login') &&
      !request.nextUrl.pathname.startsWith('/admin/callback')) {

    if (!user || !ADMIN_EMAILS.includes(user.email ?? '')) {
      const loginUrl = getExternalUrl(request, '/admin/login', {
        next: request.nextUrl.pathname,
      })
      return NextResponse.redirect(loginUrl)
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/admin/:path*'],
}
