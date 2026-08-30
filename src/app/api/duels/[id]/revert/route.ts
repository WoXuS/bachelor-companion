import {defineRoute} from '@/server/api/route'
import {idParams} from '@/server/api/schemas'
import {revertDuel} from '@/server/db/services/duels.service'

export const POST = defineRoute({
    admin: true,
    params: idParams,
    handler: ({params}) => revertDuel(params.id),
})
