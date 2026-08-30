import {defineRoute} from '@/server/api/route'
import {isAdminRequest} from '@/lib/session'

export const GET = defineRoute({
    handler: async ({req}) => ({isAdmin: await isAdminRequest(req)}),
})
