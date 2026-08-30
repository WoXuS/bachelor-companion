import {z} from 'zod'
import {defineRoute} from '@/server/api/route'
import {idParams} from '@/server/api/schemas'
import {markGroom} from '@/server/db/services/quiz.service'

export const POST = defineRoute({
    admin: true,
    params: idParams,
    body: z.object({correct: z.boolean()}),
    handler: async ({params, body}) => {
        await markGroom(params.id, body.correct)
        return {ok: true}
    },
})
