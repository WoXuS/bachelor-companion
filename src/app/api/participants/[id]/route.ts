import {defineRoute} from '@/server/api/route'
import {idParams} from '@/server/api/schemas'
import {deleteParticipant} from '@/server/db/repositories/participants.repo'

export const DELETE = defineRoute({
    admin: true,
    params: idParams,
    handler: async ({params}) => {
        await deleteParticipant(params.id)
        return {ok: true}
    },
})
