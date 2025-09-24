import {NextRequest} from "next/server";
import { cookies } from 'next/headers'

export async function isAdminServer(): Promise<boolean> {
    const store = await cookies()
    return store.get(ADMIN_COOKIE)?.value === '1'
}

export const ADMIN_COOKIE = 'sb_admin'

export function isAdminFromRequest(req: NextRequest): boolean {
    return req.cookies.get(ADMIN_COOKIE)?.value === '1'
}

export const adminCookieOptions = {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 12,
}
