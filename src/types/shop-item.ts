export type ShopItemDto = {
    discountPercent?: number | null
    discountsEnabled?: boolean | false
    id: string
    key: string
    label: string
    cost: number
    category: string
    adjustOverrideEnabled?: boolean | false
    adjustPercent?: number | null
    pricingSource?: 'global' | 'item' | null
}
export type UpdateShopItemPatch = {
    label?: string
    category?: string
    cost?: number
    adjustPercent?: number
    adjustOverrideEnabled?: boolean
}