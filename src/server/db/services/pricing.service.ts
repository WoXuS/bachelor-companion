import {prisma} from '../prisma'

export async function getEffectiveMultiplier(now = new Date()): Promise<number> {
    const cfg = await prisma.shopConfig.findUnique({where: {id: 'singleton'}})
    if (!cfg) return 100
    if (!cfg.dynamicEnabled) return cfg.priceMultiplier

    const {earlyStart, lateStart} = cfg
    if (earlyStart && now >= earlyStart && (!lateStart || now < lateStart)) return 80
    if (lateStart && now >= lateStart) return 120
    return cfg.priceMultiplier
}

export function applyMultiplier(baseCost: number, multiplier: number): number {
    const raw = Math.round((baseCost * multiplier) / 100)
    return Math.round(raw / 20) * 20
}

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