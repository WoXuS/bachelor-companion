export type SeedPair = {A: string | null; B: string | null}

export function nextPowerOfTwo(n: number): number {
    return 1 << Math.ceil(Math.log2(Math.max(2, n)))
}

export function bracketOrder(size: number): number[] {
    if (size === 1) return [1]
    const half = bracketOrder(size / 2)
    const mirrored = half.map((seed) => size + 1 - seed)
    return half.flatMap((seed, i) => [seed, mirrored[i]])
}

export function buildSingleElim(participantIds: string[]): SeedPair[][] {
    const size = nextPowerOfTwo(participantIds.length)
    const slots: (string | null)[] = [
        ...participantIds,
        ...Array<null>(size - participantIds.length).fill(null),
    ]

    const firstRound: SeedPair[] = []
    for (let i = 0; i < size; i += 2) firstRound.push({A: slots[i], B: slots[i + 1]})

    const rounds = [firstRound]
    for (let count = firstRound.length; count > 1; ) {
        count = Math.floor(count / 2)
        rounds.push(Array.from({length: count}, () => ({A: null, B: null})))
    }
    return rounds
}

export function shuffle<T>(items: T[], random: () => number = Math.random): T[] {
    const result = [...items]
    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1))
        ;[result[i], result[j]] = [result[j], result[i]]
    }
    return result
}

export function bestOfForRound(round: number, finalRound: number): 1 | 3 | 5 {
    if (round === finalRound) return 5
    return round <= 2 ? 1 : 3
}
