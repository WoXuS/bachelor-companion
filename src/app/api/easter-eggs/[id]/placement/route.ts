import {z} from 'zod'
import {defineRoute} from '@/server/api/route'
import {idParams} from '@/server/api/schemas'
import {assignPlacement} from '@/server/db/services/easter-eggs.service'

export const PUT = defineRoute({
    admin: true,
    params: idParams,
    body: z.object({placementKey: z.string().trim().min(1).nullable()}),
    handler: ({params, body}) => assignPlacement(params.id, body.placementKey),
})
