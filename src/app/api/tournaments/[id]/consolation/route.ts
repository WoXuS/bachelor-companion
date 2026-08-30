import {defineRoute} from '@/server/api/route'
import {idParams} from '@/server/api/schemas'
import {createConsolationBracket} from '@/server/db/services/tournaments.service'

export const POST = defineRoute({
    admin: true,
    params: idParams,
    handler: async ({params}) => {
        await createConsolationBracket(params.id)
        return {ok: true}
    },
})
