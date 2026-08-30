import {defineRoute} from '@/server/api/route'
import {idParams} from '@/server/api/schemas'
import {reseedRound1} from '@/server/db/services/tournaments.service'

export const POST = defineRoute({
    admin: true,
    params: idParams,
    handler: async ({params}) => {
        await reseedRound1(params.id)
        return {ok: true}
    },
})
