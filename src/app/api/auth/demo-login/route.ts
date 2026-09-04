import {NextResponse} from 'next/server'
import {notFound} from '@/lib/errors'
import {isDemoMode} from '@/lib/demo'
import {ADMIN_COOKIE, adminCookieOptions, createAdminToken} from '@/lib/session'
import {defineRoute} from '@/server/api/route'

export const POST = defineRoute({
    handler: async () => {
        if (!isDemoMode()) throw notFound('Nie znaleziono')
        const res = NextResponse.json({ok: true})
        res.cookies.set(ADMIN_COOKIE, await createAdminToken(), adminCookieOptions)
        return res
    },
})
