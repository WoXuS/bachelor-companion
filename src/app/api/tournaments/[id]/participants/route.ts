import {z} from 'zod'
import {defineRoute} from '@/server/api/route'
import {idParams, teamInput} from '@/server/api/schemas'
import {replaceTournamentEntrants} from '@/server/db/services/tournaments.service'

const body = z.union([
    z.object({participantIds: z.array(z.string().min(1))}),
    z.object({teamA: teamInput, teamB: teamInput}),
])

export const PUT = defineRoute({
    admin: true,
    params: idParams,
    body,
    handler: async ({params, body}) => {
        await replaceTournamentEntrants(params.id, body)
        return {ok: true}
    },
})
