import {z} from 'zod'
import {defineRoute} from '@/server/api/route'
import {purchaseFor} from '@/server/db/services/economy.service'

export const POST = defineRoute({
    admin: true,
    body: z.object({participantId: z.string().min(1), itemId: z.string().min(1)}),
    handler: ({body}) => purchaseFor(body.participantId, body.itemId),
})
