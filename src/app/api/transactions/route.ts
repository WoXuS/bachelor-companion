import {z} from 'zod'
import {defineRoute} from '@/server/api/route'
import {listTransactions} from '@/server/db/repositories/transaction.repo'

const query = z.object({
    participantId: z.string().min(1).optional(),
    order: z.enum(['asc', 'desc']).default('desc'),
})

export const GET = defineRoute({
    handler: ({req}) => {
        const {participantId, order} = query.parse({
            participantId: req.nextUrl.searchParams.get('participantId') ?? undefined,
            order: req.nextUrl.searchParams.get('order') ?? undefined,
        })
        return listTransactions({participantId, order})
    },
})
