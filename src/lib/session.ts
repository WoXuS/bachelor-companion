import {cookies} from 'next/headers'
import type {NextRequest} from 'next/server'
import {ADMIN_COOKIE, verifyAdminToken} from './session-token'

export {ADMIN_COOKIE, adminCookieOptions, createAdminToken, verifyAdminPassword} from './session-token'

export function isAdminRequest(req: NextRequest): Promise<boolean> {
    return verifyAdminToken(req.cookies.get(ADMIN_COOKIE)?.value)
}

export async function isAdminServer(): Promise<boolean> {
    const store = await cookies()
    return verifyAdminToken(store.get(ADMIN_COOKIE)?.value)
}
