import {DEMO_RESET_NOTE, isDemoMode} from '@/lib/demo'
import {defineRoute} from '@/server/api/route'

export const dynamic = 'force-dynamic'

export const GET = defineRoute({
    handler: async () => ({demo: isDemoMode(), resetNote: DEMO_RESET_NOTE}),
})
