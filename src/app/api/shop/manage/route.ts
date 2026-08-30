import {z} from 'zod'
import {defineRoute} from '@/server/api/route'
import {createShopItem, updateShopItem} from '@/server/db/repositories/shop.repo'

export const POST = defineRoute({
    admin: true,
    body: z.object({
        key: z.string().trim().min(1),
        label: z.string().trim().min(1),
        cost: z.coerce.number().int().min(0),
        category: z.string().trim().min(1).default('misc'),
    }),
    handler: ({body}) => createShopItem(body),
})

export const PUT = defineRoute({
    admin: true,
    body: z.object({
        id: z.string().min(1),
        label: z.string().trim().min(1).optional(),
        category: z.string().trim().min(1).optional(),
        cost: z.coerce.number().int().min(0).optional(),
        adjustPercent: z.coerce.number().int().optional(),
        adjustOverrideEnabled: z.boolean().optional(),
    }),
    handler: ({body}) => {
        const {id, ...patch} = body
        return updateShopItem(id, patch)
    },
})
