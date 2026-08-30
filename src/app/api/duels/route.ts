import {z} from 'zod'
import {defineRoute} from '@/server/api/route'
import {listDuels} from '@/server/db/repositories/duels.repo'
import {createDuel} from '@/server/db/services/duels.service'

export const GET = defineRoute({handler: () => listDuels()})

export const POST = defineRoute({
    admin: true,
    body: z.object({
        title: z.string().trim().min(1),
        stake: z.coerce.number().int().min(0),
        playerAId: z.string().min(1),
        playerBId: z.string().min(1),
    }),
    handler: ({body}) => createDuel(body),
})
