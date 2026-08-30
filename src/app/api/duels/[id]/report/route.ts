import {z} from 'zod'
import {defineRoute} from '@/server/api/route'
import {idParams, score, winnerSide} from '@/server/api/schemas'
import {reportDuel, revertDuel} from '@/server/db/services/duels.service'

export const POST = defineRoute({
    admin: true,
    params: idParams,
    body: z.object({winner: winnerSide, scoreA: score, scoreB: score}),
    handler: async ({params, body}) => {
        await reportDuel({id: params.id, ...body})
        return {ok: true}
    },
})

export const DELETE = defineRoute({
    admin: true,
    params: idParams,
    handler: async ({params}) => {
        await revertDuel(params.id)
        return {ok: true}
    },
})
