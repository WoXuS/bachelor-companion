import {defineRoute} from '@/server/api/route'
import {idParams, participantIdBody} from '@/server/api/schemas'
import {claimEgg} from '@/server/db/services/easter-eggs.service'
import {publishEggClaimed} from '@/server/realtime/pusher'

export const POST = defineRoute({
    params: idParams,
    body: participantIdBody,
    handler: async ({params, body}) => {
        const {tx, event} = await claimEgg({id: params.id}, body.participantId)
        void publishEggClaimed(event)
        return tx
    },
})
