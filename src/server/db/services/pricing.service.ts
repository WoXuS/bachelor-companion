import {prisma} from '../prisma'

export type RoundingMode = 'step' | 'preferred'

export async function getShopConfig() {
    const cfg = await prisma.shopConfig.findUnique({where: {id: 'singleton'}})
    return cfg ?? {discountsEnabled: false, discountPercent: 20}
}

type RoundDir = 'down' | 'up' | 'nearest'
type RoundMode = 'preferred' | 'nearest20'

export function isReachableWithNotes(n: number): boolean {
    if (n < 0) return false
    if (n === 0) return true
    if (n % 10 !== 0) return false
    if (n === 10 || n === 30) return false
    return true
}


export function roundToPreferred(amount: number, direction: RoundDir = 'nearest'): number {
    if (amount < 0) return 0
    const a = Math.round(amount)

    if (isReachableWithNotes(a)) return a

    const maxSpan = 200
    const step = 1
    if (direction === 'down') {
        for (let d = 0; d <= maxSpan; d += step) {
            const v = a - d
            if (v < 0) return 0
            if (isReachableWithNotes(v)) return v
        }
    } else if (direction === 'up') {
        for (let d = 0; d <= maxSpan; d += step) {
            const v = a + d
            if (isReachableWithNotes(v)) return v
        }
    } else {
        for (let d = 0; d <= maxSpan; d += step) {
            const down = a - d
            const up = a + d
            const downOk = isReachableWithNotes(down)
            const upOk = isReachableWithNotes(up)
            if (downOk && upOk) return down
            if (downOk) return down
            if (upOk) return up
        }
    }
    return a
}

export function roundNearest20(n: number): number {
    if (n <= 0) return 0
    return Math.round(n / 20) * 20
}

function applyPercent(base: number, percent: number): number {
    return Math.round(base * (1 + percent / 100))
}

export function computeEffectivePrice(
    baseCost: number,
    global: { enabled: boolean; percent: number },
    item: { overrideEnabled: boolean; percent: number },
    mode: RoundMode = 'preferred'
): { value: number; source: 'item' | 'global' | 'none'; appliedPercent: number } {
    let applied = 0
    let source: 'item' | 'global' | 'none' = 'none'

    if (item.overrideEnabled && item.percent !== 0) {
        applied = item.percent
        source = 'item'
    } else if (global.enabled && global.percent > 0) {
        applied = -global.percent
        source = 'global'
    }

    const raw = applied ? applyPercent(baseCost, applied) : baseCost
    const dir: RoundDir = applied < 0 ? 'down' : applied > 0 ? 'up' : 'nearest'

    let value = raw
    if (mode === 'preferred') {
        value = roundToPreferred(raw, dir)
    } else {
        value = roundNearest20(raw)
    }
    if (value < 0) value = 0

    return {value, source, appliedPercent: applied}
}

export function applyDiscountRounded(
    baseCost: number,
    discountsEnabled: boolean,
    discountPercent: number,
    opts?: { mode?: RoundMode }
): number {
    const {value} = computeEffectivePrice(
        baseCost,
        {enabled: discountsEnabled, percent: discountPercent},
        {overrideEnabled: false, percent: 0},
        opts?.mode ?? 'preferred'
    )
    return value
}
