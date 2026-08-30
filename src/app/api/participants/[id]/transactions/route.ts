import {z} from 'zod'
import {defineRoute} from '@/server/api/route'
import {idParams} from '@/server/api/schemas'
import {addTransaction} from '@/server/db/services/economy.service'

export const POST = defineRoute({
    admin: true,
    params: idParams,
    body: z.object({amount: z.number().int(), reason: z.string().trim().min(1)}),
    handler: ({params, body}) =>
        addTransaction({participantId: params.id, amount: body.amount, reason: body.reason}),
})
