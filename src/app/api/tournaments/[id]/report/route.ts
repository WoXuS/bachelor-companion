import {z} from 'zod'
import {defineRoute} from '@/server/api/route'
import {score, winnerSide} from '@/server/api/schemas'
import {reportMatch} from '@/server/db/services/tournaments.service'

export const POST = defineRoute({
    admin: true,
    body: z.object({
        matchId: z.string().min(1),
        winner: winnerSide,
        scoreA: score,
        scoreB: score,
    }),
    handler: async ({body}) => {
        await reportMatch(body)
        return {ok: true}
    },
})
