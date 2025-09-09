import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export const config = { matcher: ['/admin/:path*', '/api/:path*'] }

export function middleware(req: NextRequest) {
    const isAdminCookie = req.cookies.get('sb_admin')?.value === '1'
    const isAdminRoute = req.nextUrl.pathname.startsWith('/admin')
    const isMutation = req.method !== 'GET' && req.nextUrl.pathname.startsWith('/api')

    if ((isAdminRoute || isMutation) && !isAdminCookie) {
        if (isAdminRoute) return NextResponse.redirect(new URL('/admin/login', req.url))
        return new NextResponse('Unauthorized', { status: 401 })
    }
    return NextResponse.next()
}
