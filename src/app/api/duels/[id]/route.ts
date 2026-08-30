import {z} from 'zod'
import {notFound} from '@/lib/errors'
import {defineRoute} from '@/server/api/route'
import {bestOfBody, idParams} from '@/server/api/schemas'
import {getDuel} from '@/server/db/repositories/duels.repo'
import {deleteDuel, updateDuel} from '@/server/db/services/duels.service'
import {prisma} from '@/server/db/prisma'

export const GET = defineRoute({
    params: idParams,
    handler: async ({params}) => {
        const duel = await getDuel(params.id)
        if (!duel) throw notFound('Pojedynek nie znaleziony')
        return duel
    },
})

export const PATCH = defineRoute({
    admin: true,
    params: idParams,
    body: bestOfBody,
    handler: ({params, body}) =>
        prisma.duel.update({where: {id: params.id}, data: {bestOf: body.bestOf}}),
})

export const PUT = defineRoute({
    admin: true,
    params: idParams,
    body: z.object({
        title: z.string().trim().min(1).optional(),
        stake: z.coerce.number().int().min(0).optional(),
        playerAId: z.string().min(1).optional(),
        playerBId: z.string().min(1).optional(),
    }),
    handler: ({params, body}) => updateDuel(params.id, body),
})

export const DELETE = defineRoute({
    admin: true,
    params: idParams,
    handler: ({params}) => deleteDuel(params.id),
})
