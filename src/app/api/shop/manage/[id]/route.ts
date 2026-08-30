import {defineRoute} from '@/server/api/route'
import {idParams} from '@/server/api/schemas'
import {deleteShopItem} from '@/server/db/repositories/shop.repo'

export const DELETE = defineRoute({
    admin: true,
    params: idParams,
    handler: async ({params}) => {
        await deleteShopItem(params.id)
        return {ok: true}
    },
})
