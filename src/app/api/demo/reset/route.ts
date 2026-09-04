import {notFound, unauthorized} from '@/lib/errors'
import {isDemoMode} from '@/lib/demo'
import {defineRoute} from '@/server/api/route'
import {resetDemoData} from '@/server/db/seed/demo'

export const maxDuration = 60

export const POST = defineRoute({
    handler: async ({req}) => {
        if (!isDemoMode()) throw notFound('Nie znaleziono')

        const secret = process.env.CRON_SECRET
        if (!secret) throw unauthorized('CRON_SECRET nie jest ustawiony')
        if (req.headers.get('authorization') !== `Bearer ${secret}`) throw unauthorized()

        return resetDemoData()
    },
})
