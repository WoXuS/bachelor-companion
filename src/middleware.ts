import {NextResponse} from 'next/server'
import type {NextRequest} from 'next/server'
import {isAdminRequest} from '@/lib/session'

export const config = {
    matcher: ['/admin/:path*', '/api/:path*'],
}

const PUBLIC_MUTATIONS = [
    /^\/api\/auth\/(login|logout)$/,
    /^\/api\/easter-eggs\/[^/]+\/claim$/,
    /^\/api\/easter-eggs\/by-code\/[^/]+$/,
]

export async function middleware(req: NextRequest) {
    const {pathname} = req.nextUrl

    if (pathname === '/admin/login') return NextResponse.next()

    const isAdminPage = pathname.startsWith('/admin')
    const isProtectedApi =
        pathname.startsWith('/api') &&
        req.method !== 'GET' &&
        !PUBLIC_MUTATIONS.some((pattern) => pattern.test(pathname))

    if (!isAdminPage && !isProtectedApi) return NextResponse.next()
    if (await isAdminRequest(req)) return NextResponse.next()

    if (isAdminPage) {
        const url = req.nextUrl.clone()
        url.pathname = '/admin/login'
        return NextResponse.redirect(url)
    }
    return NextResponse.json({message: 'Unauthorized'}, {status: 401})
}
