import {prisma} from '../prisma'

export type RoundingMode = 'step' | 'preferred'

export type RoundingOptions = {
    mode?: RoundingMode
    step?: 20 | 50 | 100
    steps?: number[]
    min?: number
}

export async function getShopConfig() {
    const cfg = await prisma.shopConfig.findUnique({where: {id: 'singleton'}})
    return cfg ?? {discountsEnabled: false, discountPercent: 20}
}

function roundToStep(value: number, step: number) {
    if (step <= 0) return value
    return Math.round(value / step) * step
}

function roundToPreferred(value: number, steps: number[]) {
    const uniq = Array.from(new Set(steps.filter(s => s > 0))).sort((a, b) => b - a)
    if (uniq.length === 0) return value
    const candidates = uniq.map(step => {
        const rounded = roundToStep(value, step)
        return {step, rounded, diff: Math.abs(rounded - value)}
    })
    candidates.sort((a, b) => {
        if (a.diff !== b.diff) return a.diff - b.diff
        return b.step - a.step
    })
    return candidates[0].rounded
}

export function applyDiscountRounded(
    base: number,
    enabled: boolean,
    percent: number,
    opts: RoundingOptions = {}
) {
    const mode = opts.mode ?? 'preferred'
    const steps = opts.steps ?? [100, 50, 20]
    const step = opts.step ?? 20
    const minAllowed = opts.min ?? Math.min(...steps)

    const mult = enabled ? (100 - percent) : 100
    const raw = Math.round((base * mult) / 100)

    let rounded = raw
    if (mode === 'step') {
        rounded = roundToStep(raw, step)
    } else {
        rounded = roundToPreferred(raw, steps)
    }

    return Math.max(minAllowed, rounded)
}

export function applyDiscountRound20(base: number, enabled: boolean, percent: number) {
    return applyDiscountRounded(base, enabled, percent, {mode: 'step', step: 20})
}
