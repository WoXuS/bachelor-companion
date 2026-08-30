import {z} from 'zod'
import {defineRoute} from '@/server/api/route'
import {listAllParticipants, upsertParticipant} from '@/server/db/repositories/participants.repo'

export const GET = defineRoute({handler: () => listAllParticipants()})

export const POST = defineRoute({
    admin: true,
    body: z.object({
        id: z.string().min(1).optional(),
        name: z.string().trim().min(1),
        avatarUrl: z.string().trim().min(1).nullish(),
    }),
    handler: ({body}) => upsertParticipant(body),
})
