import {defineRoute} from '@/server/api/route'
import {listShopItemsWithPricing} from '@/server/db/services/pricing.service'

export const GET = defineRoute({handler: () => listShopItemsWithPricing()})
