import {defineRoute} from '@/server/api/route'
import {idParams, participantIdBody} from '@/server/api/schemas'
import {awardAudience} from '@/server/db/services/quiz.service'

export const POST = defineRoute({
    admin: true,
    params: idParams,
    body: participantIdBody,
    handler: async ({params, body}) => {
        await awardAudience(params.id, body.participantId)
        return {ok: true}
    },
})
