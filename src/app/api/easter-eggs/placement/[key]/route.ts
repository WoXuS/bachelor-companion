import {defineRoute} from '@/server/api/route'
import {keyParams} from '@/server/api/schemas'
import {getEggByPlacement} from '@/server/db/services/easter-eggs.service'

export const GET = defineRoute({
    params: keyParams,
    handler: async ({params}) => (await getEggByPlacement(params.key)) ?? null,
})
