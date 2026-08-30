import {notFound} from '@/lib/errors'
import {defineRoute} from '@/server/api/route'
import {idParams} from '@/server/api/schemas'
import {getEggWithCounts} from '@/server/db/services/easter-eggs.service'
import {toPublicEgg} from '@/server/api/serializers'

export const GET = defineRoute({
    params: idParams,
    handler: async ({params}) => {
        const found = await getEggWithCounts({id: params.id})
        if (!found) throw notFound('Nie znaleziono')
        return toPublicEgg(found.egg, found.counts)
    },
})
