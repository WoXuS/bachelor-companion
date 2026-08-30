import {defineRoute} from '@/server/api/route'
import {bestOfBody, idParams} from '@/server/api/schemas'
import {setMatchBestOf} from '@/server/db/repositories/matches.repo'

export const PATCH = defineRoute({
    admin: true,
    params: idParams,
    body: bestOfBody,
    handler: ({params, body}) => setMatchBestOf(params.id, body.bestOf),
})
