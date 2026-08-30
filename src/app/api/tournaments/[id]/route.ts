import {z} from 'zod'
import {notFound} from '@/lib/errors'
import {defineRoute} from '@/server/api/route'
import {idParams, nonNegativeInt} from '@/server/api/schemas'
import {deleteTournament, getTournament} from '@/server/db/repositories/tournaments.repo'
import {updateTournamentBasics} from '@/server/db/services/tournaments.service'

export const GET = defineRoute({
    params: idParams,
    handler: async ({params}) => {
        const tournament = await getTournament(params.id)
        if (!tournament) throw notFound('Turniej nie znaleziony')
        return tournament
    },
})

export const PUT = defineRoute({
    admin: true,
    params: idParams,
    body: z.object({
        title: z.string().trim().min(1).optional(),
        mainPrize: nonNegativeInt.optional(),
        matchWinPrize: nonNegativeInt.optional(),
        consolationPrize: nonNegativeInt.optional(),
    }),
    handler: ({params, body}) => updateTournamentBasics(params.id, body),
})

export const DELETE = defineRoute({
    admin: true,
    params: idParams,
    handler: ({params}) => deleteTournament(params.id),
})
