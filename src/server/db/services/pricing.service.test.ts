import {describe, expect, it} from 'vitest'
import {computeEffectivePrice, isReachableWithNotes, roundToPreferred} from './pricing.service'

const noGlobal = {enabled: false, percent: 0}
const noItem = {overrideEnabled: false, percent: 0}

describe('isReachableWithNotes', () => {
    it('accepts zero and multiples of ten from twenty up', () => {
        expect(isReachableWithNotes(0)).toBe(true)
        expect(isReachableWithNotes(20)).toBe(true)
        expect(isReachableWithNotes(50)).toBe(true)
    })

    it('rejects amounts no note combination can make', () => {
        expect(isReachableWithNotes(10)).toBe(false)
        expect(isReachableWithNotes(30)).toBe(false)
    })

    it('rejects non-multiples of ten and negatives', () => {
        expect(isReachableWithNotes(45)).toBe(false)
        expect(isReachableWithNotes(-20)).toBe(false)
    })
})

describe('roundToPreferred', () => {
    it('leaves already reachable amounts untouched', () => {
        expect(roundToPreferred(100)).toBe(100)
        expect(roundToPreferred(0)).toBe(0)
    })

    it('rounds down when asked to', () => {
        expect(roundToPreferred(95, 'down')).toBe(90)
        expect(roundToPreferred(35, 'down')).toBe(20)
    })

    it('rounds up when asked to', () => {
        expect(roundToPreferred(95, 'up')).toBe(100)
        expect(roundToPreferred(15, 'up')).toBe(20)
    })

    it('prefers the lower value on a tie', () => {
        expect(roundToPreferred(25)).toBe(20)
    })

    it('never returns a negative amount', () => {
        expect(roundToPreferred(-50)).toBe(0)
        expect(roundToPreferred(5, 'down')).toBe(0)
    })

    it('always returns a reachable amount', () => {
        for (let n = 0; n <= 300; n++) {
            expect(isReachableWithNotes(roundToPreferred(n))).toBe(true)
        }
    })
})

describe('computeEffectivePrice', () => {
    it('returns the base cost when no discount applies', () => {
        expect(computeEffectivePrice(100, noGlobal, noItem)).toEqual({
            value: 100,
            source: 'none',
            appliedPercent: 0,
        })
    })

    it('applies a global discount and rounds down', () => {
        const result = computeEffectivePrice(100, {enabled: true, percent: 20}, noItem)
        expect(result.source).toBe('global')
        expect(result.appliedPercent).toBe(-20)
        expect(result.value).toBe(80)
    })

    it('lets an item override win over the global discount', () => {
        const result = computeEffectivePrice(
            100,
            {enabled: true, percent: 20},
            {overrideEnabled: true, percent: 50},
        )
        expect(result.source).toBe('item')
        expect(result.appliedPercent).toBe(50)
        expect(result.value).toBe(150)
    })

    it('ignores an override set to zero percent', () => {
        const result = computeEffectivePrice(
            100,
            {enabled: true, percent: 20},
            {overrideEnabled: true, percent: 0},
        )
        expect(result.source).toBe('global')
    })

    it('ignores a global discount of zero percent', () => {
        expect(computeEffectivePrice(100, {enabled: true, percent: 0}, noItem).source).toBe('none')
    })

    it('rounds a surcharge up and a discount down', () => {
        const discounted = computeEffectivePrice(100, {enabled: true, percent: 15}, noItem)
        const surcharged = computeEffectivePrice(
            100,
            noGlobal,
            {overrideEnabled: true, percent: 15},
        )
        expect(discounted.value).toBe(80)
        expect(surcharged.value).toBe(120)
    })

    it('never produces a negative price', () => {
        const result = computeEffectivePrice(50, {enabled: true, percent: 100}, noItem)
        expect(result.value).toBe(0)
    })

    it('always produces a reachable price', () => {
        for (let cost = 0; cost <= 250; cost += 5) {
            for (const percent of [10, 20, 33, 50]) {
                expect(
                    isReachableWithNotes(
                        computeEffectivePrice(cost, {enabled: true, percent}, noItem).value,
                    ),
                ).toBe(true)
            }
        }
    })
})
