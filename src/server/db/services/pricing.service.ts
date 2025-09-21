import {prisma} from '../prisma'

export async function getShopConfig() {
    const cfg = await prisma.shopConfig.findUnique({ where: { id: 'singleton' } })
    if (!cfg) {
        return { discountsEnabled: false, discountPercent: 20 }
    }
    return cfg
}

export function applyDiscountRound20(base: number, enabled: boolean, percent: number) {
    const mult = enabled ? (100 - percent) : 100
    const raw = Math.round(base * mult / 100)
    return Math.max(20, Math.round(raw / 20) * 20)
}