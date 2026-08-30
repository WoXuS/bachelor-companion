import {notFound} from '@/lib/errors'
import {defineRoute} from '@/server/api/route'
import {codeParams, participantIdBody} from '@/server/api/schemas'
import {claimEgg, getEggWithCounts} from '@/server/db/services/easter-eggs.service'
import {toPublicEgg} from '@/server/api/serializers'
import {publishEggClaimed} from '@/server/realtime/pusher'

export const GET = defineRoute({
    params: codeParams,
    handler: async ({params}) => {
        const found = await getEggWithCounts({code: params.code})
        if (!found) throw notFound('Nie znaleziono')
        return toPublicEgg(found.egg, found.counts)
    },
})

export const POST = defineRoute({
    params: codeParams,
    body: participantIdBody,
    handler: async ({params, body}) => {
        const {tx, event} = await claimEgg({code: params.code}, body.participantId)
        void publishEggClaimed(event)
        return tx
    },
})
