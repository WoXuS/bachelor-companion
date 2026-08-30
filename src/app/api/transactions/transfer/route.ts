import {z} from 'zod'
import {defineRoute} from '@/server/api/route'
import {transferBetween} from '@/server/db/services/economy.service'

export const POST = defineRoute({
    admin: true,
    body: z.object({
        fromId: z.string().min(1),
        toId: z.string().min(1),
        amount: z.coerce.number().int().positive(),
        reason: z.string().trim().min(1),
    }),
    handler: ({body}) =>
        transferBetween({
            fromId: body.fromId,
            toId: body.toId,
            amount: body.amount,
            reasonTo: body.reason,
        }),
})
