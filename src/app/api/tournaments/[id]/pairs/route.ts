import {z} from 'zod'
import {defineRoute} from '@/server/api/route'
import {idParams} from '@/server/api/schemas'
import {reseedPairs} from '@/server/db/services/tournaments.service'

export const PUT = defineRoute({
    admin: true,
    params: idParams,
    body: z.object({
        round: z.coerce.number().int().min(1).default(1),
        pairs: z.array(
            z.object({
                matchId: z.string().min(1),
                participantAId: z.string().min(1).nullable(),
                participantBId: z.string().min(1).nullable(),
            }),
        ),
    }),
    handler: async ({params, body}) => {
        await reseedPairs(params.id, body.round, body.pairs)
        return {ok: true}
    },
})
