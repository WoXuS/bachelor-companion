import {defineRoute} from '@/server/api/route'
import {idParams} from '@/server/api/schemas'
import {revertMatch} from '@/server/db/services/matches.service'

export const POST = defineRoute({
    admin: true,
    params: idParams,
    handler: ({params}) => revertMatch(params.id),
})
