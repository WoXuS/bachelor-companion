import {describe, expect, it} from 'vitest'
import {bestOfForRound, bracketOrder, buildSingleElim, nextPowerOfTwo, shuffle} from './bracket'

describe('nextPowerOfTwo', () => {
    it('keeps exact powers of two', () => {
        expect(nextPowerOfTwo(4)).toBe(4)
        expect(nextPowerOfTwo(8)).toBe(8)
    })

    it('rounds up to the next power of two', () => {
        expect(nextPowerOfTwo(5)).toBe(8)
        expect(nextPowerOfTwo(12)).toBe(16)
    })

    it('never returns less than two', () => {
        expect(nextPowerOfTwo(0)).toBe(2)
        expect(nextPowerOfTwo(1)).toBe(2)
    })
})

describe('bracketOrder', () => {
    it('pairs the top seed against the bottom seed', () => {
        expect(bracketOrder(2)).toEqual([1, 2])
        expect(bracketOrder(4)).toEqual([1, 4, 2, 3])
        expect(bracketOrder(8)).toEqual([1, 8, 4, 5, 2, 7, 3, 6])
    })

    it('returns each seed exactly once', () => {
        const order = bracketOrder(16)
        expect(new Set(order).size).toBe(16)
        expect([...order].sort((a, b) => a - b)).toEqual(
            Array.from({length: 16}, (_, i) => i + 1),
        )
    })

    it('pairs every seed with its complement', () => {
        const order = bracketOrder(8)
        for (let i = 0; i < order.length; i += 2) {
            expect(order[i] + order[i + 1]).toBe(9)
        }
    })

    it('keeps the two best seeds in opposite halves', () => {
        const order = bracketOrder(16)
        expect(order.indexOf(1)).toBeLessThan(8)
        expect(order.indexOf(2)).toBeGreaterThanOrEqual(8)
    })
})

describe('buildSingleElim', () => {
    it('creates one pair per two participants in round one', () => {
        const rounds = buildSingleElim(['a', 'b', 'c', 'd'])
        expect(rounds[0]).toEqual([
            {A: 'a', B: 'b'},
            {A: 'c', B: 'd'},
        ])
    })

    it('pads an odd field with byes', () => {
        const rounds = buildSingleElim(['a', 'b', 'c'])
        expect(rounds[0]).toEqual([
            {A: 'a', B: 'b'},
            {A: 'c', B: null},
        ])
    })

    it('halves the match count every round down to a single final', () => {
        const rounds = buildSingleElim(Array.from({length: 8}, (_, i) => `p${i}`))
        expect(rounds.map((r) => r.length)).toEqual([4, 2, 1])
    })

    it('leaves later rounds empty', () => {
        const rounds = buildSingleElim(['a', 'b', 'c', 'd'])
        expect(rounds[1]).toEqual([{A: null, B: null}])
    })
})

describe('shuffle', () => {
    it('preserves every element', () => {
        const input = ['a', 'b', 'c', 'd', 'e']
        expect([...shuffle(input)].sort()).toEqual([...input].sort())
    })

    it('does not mutate the input', () => {
        const input = ['a', 'b', 'c']
        shuffle(input, () => 0)
        expect(input).toEqual(['a', 'b', 'c'])
    })

    it('is deterministic for a fixed random source', () => {
        const input = ['a', 'b', 'c', 'd']
        expect(shuffle(input, () => 0)).toEqual(shuffle(input, () => 0))
    })
})

describe('bestOfForRound', () => {
    it('plays the final as best of five', () => {
        expect(bestOfForRound(4, 4)).toBe(5)
    })

    it('plays early rounds as single matches', () => {
        expect(bestOfForRound(1, 5)).toBe(1)
        expect(bestOfForRound(2, 5)).toBe(1)
    })

    it('plays middle rounds as best of three', () => {
        expect(bestOfForRound(3, 5)).toBe(3)
        expect(bestOfForRound(4, 5)).toBe(3)
    })
})
