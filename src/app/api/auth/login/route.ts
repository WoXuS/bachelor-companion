import { NextResponse } from 'next/server'
import { ADMIN_COOKIE, adminCookieOptions } from '@/lib/session'

export async function POST(req: Request) {
    const { password } = await req.json()
    if (!password || password !== process.env.ADMIN_PASSWORD) {
        return NextResponse.json({ ok: false }, { status: 401 })
    }
    const res = NextResponse.json({ ok: true })
    res.cookies.set(ADMIN_COOKIE, '1', adminCookieOptions)
    return res
}