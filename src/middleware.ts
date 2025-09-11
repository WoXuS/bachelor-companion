import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { isAdminServer } from '@/lib/session'

export const config = {
    matcher: ['/admin/:path*', '/api/:path*'],
}

export function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl

    const isLoginPage = pathname === '/admin/login'
    const isAuthRoute = pathname.startsWith('/api/auth/')

    if (isLoginPage || isAuthRoute) {
        return NextResponse.next()
    }

    const isAdminRoute = pathname.startsWith('/admin')
    const isMutationApi = pathname.startsWith('/api') && req.method !== 'GET'

    if ((isAdminRoute || isMutationApi) && !isAdminServer()) {
        if (isAdminRoute) {
            const url = req.nextUrl.clone()
            url.pathname = '/admin/login'
            return NextResponse.redirect(url)
        }
        return new NextResponse('Unauthorized', { status: 401 })
    }

    return NextResponse.next()
}
