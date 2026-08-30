import {prisma} from '../prisma'

export type PricingSource = 'item' | 'global' | 'none'
export type EffectivePrice = {value: number; source: PricingSource; appliedPercent: number}

type RoundDirection = 'down' | 'up' | 'nearest'

const DEFAULT_CONFIG = {discountsEnabled: false, discountPercent: 20}
const MAX_ROUNDING_SPAN = 200

export function isReachableWithNotes(amount: number): boolean {
    if (amount < 0) return false
    if (amount === 0) return true
    if (amount % 10 !== 0) return false
    return amount !== 10 && amount !== 30
}

export function roundToPreferred(amount: number, direction: RoundDirection = 'nearest'): number {
    if (amount < 0) return 0
    const target = Math.round(amount)
    if (isReachableWithNotes(target)) return target

    for (let delta = 1; delta <= MAX_ROUNDING_SPAN; delta++) {
        const down = target - delta
        const up = target + delta
        if (direction !== 'up' && isReachableWithNotes(down)) return down
        if (direction !== 'down' && isReachableWithNotes(up)) return up
        if (direction === 'down' && down < 0) return 0
    }
    return target
}

export function computeEffectivePrice(
    baseCost: number,
    global: {enabled: boolean; percent: number},
    item: {overrideEnabled: boolean; percent: number},
): EffectivePrice {
    let appliedPercent = 0
    let source: PricingSource = 'none'

    if (item.overrideEnabled && item.percent !== 0) {
        appliedPercent = item.percent
        source = 'item'
    } else if (global.enabled && global.percent > 0) {
        appliedPercent = -global.percent
        source = 'global'
    }

    if (appliedPercent === 0) {
        return {value: roundToPreferred(baseCost), source, appliedPercent}
    }

    const raw = Math.round(baseCost * (1 + appliedPercent / 100))
    const direction: RoundDirection = appliedPercent < 0 ? 'down' : 'up'
    return {value: Math.max(0, roundToPreferred(raw, direction)), source, appliedPercent}
}

export async function getShopConfig() {
    const cfg = await prisma.shopConfig.findUnique({where: {id: 'singleton'}})
    return cfg ?? DEFAULT_CONFIG
}

export function updateShopConfig(patch: {discountsEnabled?: boolean; discountPercent?: number}) {
    return prisma.shopConfig.upsert({
        where: {id: 'singleton'},
        update: patch,
        create: {
            id: 'singleton',
            discountsEnabled: patch.discountsEnabled ?? DEFAULT_CONFIG.discountsEnabled,
            discountPercent: patch.discountPercent ?? DEFAULT_CONFIG.discountPercent,
        },
    })
}

export async function listShopItemsWithPricing() {
    const [cfg, items] = await Promise.all([
        getShopConfig(),
        prisma.shopItem.findMany({orderBy: {label: 'asc'}}),
    ])

    return items.map((item) => {
        const {value, source, appliedPercent} = computeEffectivePrice(
            item.cost,
            {enabled: cfg.discountsEnabled, percent: cfg.discountPercent},
            {overrideEnabled: item.adjustOverrideEnabled, percent: item.adjustPercent},
        )
        return {
            ...item,
            effectiveCost: value,
            pricingSource: source,
            appliedPercent,
            discountsEnabled: cfg.discountsEnabled,
            discountPercent: cfg.discountPercent,
        }
    })
}
