import {z} from 'zod'
import {defineRoute} from '@/server/api/route'
import {nonNegativeInt, teamInput} from '@/server/api/schemas'
import {listTournaments} from '@/server/db/repositories/tournaments.repo'
import {createSoloTournament, createTeamTournament} from '@/server/db/services/tournaments.service'

const createBody = z.discriminatedUnion('type', [
    z.object({
        type: z.literal('SOLO'),
        title: z.string().trim().min(1),
        mainPrize: nonNegativeInt,
        matchWinPrize: nonNegativeInt,
        consolationPrize: nonNegativeInt.default(0),
        participantIds: z.array(z.string().min(1)).min(2),
    }),
    z.object({
        type: z.literal('TEAM'),
        title: z.string().trim().min(1),
        mainPrize: nonNegativeInt,
        matchWinPrize: nonNegativeInt.default(0),
        teamA: teamInput,
        teamB: teamInput,
    }),
])

export const GET = defineRoute({handler: () => listTournaments()})

export const POST = defineRoute({
    admin: true,
    body: createBody,
    handler: ({body}) =>
        body.type === 'SOLO' ? createSoloTournament(body) : createTeamTournament(body),
})
