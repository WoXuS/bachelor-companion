import { ShopItem } from '@prisma/client'

export type ShopItemDb = ShopItem

export type ShopItemDto = {
    discountPercent?: number | null
    discountsEnabled?: boolean | false
    id: string
    key: string
    label: string
    cost: number
    category: string
}
