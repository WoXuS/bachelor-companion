import {NextResponse} from 'next/server'
import {z} from 'zod'
import {ADMIN_COOKIE, adminCookieOptions, createAdminToken, verifyAdminPassword} from '@/lib/session'
import {defineRoute} from '@/server/api/route'
import {unauthorized} from '@/lib/errors'

export const POST = defineRoute({
    body: z.object({password: z.string().min(1)}),
    handler: async ({body}) => {
        if (!(await verifyAdminPassword(body.password))) throw unauthorized('Nieprawidłowe hasło')
        const res = NextResponse.json({ok: true})
        res.cookies.set(ADMIN_COOKIE, await createAdminToken(), adminCookieOptions)
        return res
    },
})
