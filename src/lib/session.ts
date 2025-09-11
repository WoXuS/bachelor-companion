import { cookies } from 'next/headers'

export const ADMIN_COOKIE = 'sb_admin'

export function isAdminServer(): boolean {
    return cookies().get(ADMIN_COOKIE)?.value === '1'
}

export const adminCookieOptions = {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 12, // 12h
}
