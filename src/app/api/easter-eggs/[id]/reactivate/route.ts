import {defineRoute} from '@/server/api/route'
import {idParams} from '@/server/api/schemas'
import {reactivateEgg} from '@/server/db/services/easter-eggs.service'

export const POST = defineRoute({
    admin: true,
    params: idParams,
    handler: ({params}) => reactivateEgg(params.id),
})
