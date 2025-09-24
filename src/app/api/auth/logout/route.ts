import {NextRequest, NextResponse} from 'next/server'
import {ADMIN_COOKIE, adminCookieOptions} from '@/lib/session'

export function POST(_req: NextRequest) {
    const res = NextResponse.json({ok: true})
    res.cookies.set(ADMIN_COOKIE, '', {
        ...adminCookieOptions,
        maxAge: 0,
    })
    return res
}
