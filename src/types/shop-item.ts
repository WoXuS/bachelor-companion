import { ShopItem } from '@prisma/client'

export type ShopItemDb = ShopItem

export type ShopItemDto = {
    id: string
    key: string
    label: string
    cost: number
    category: string
}
