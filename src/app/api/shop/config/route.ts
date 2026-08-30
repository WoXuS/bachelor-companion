import {z} from 'zod'
import {defineRoute} from '@/server/api/route'
import {getShopConfig, updateShopConfig} from '@/server/db/services/pricing.service'

export const GET = defineRoute({handler: () => getShopConfig()})

export const PUT = defineRoute({
    admin: true,
    body: z.object({
        discountsEnabled: z.boolean().optional(),
        discountPercent: z.coerce.number().int().min(0).max(100).optional(),
    }),
    handler: ({body}) => updateShopConfig(body),
})
