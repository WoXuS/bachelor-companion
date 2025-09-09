export type Seed = { id: string, name: string }
export type Pair = { a?: Seed, b?: Seed }

export function generatePairs(seeds: Seed[]): Pair[] {
    const n = seeds.length
    const pow2 = 1 << Math.ceil(Math.log2(Math.max(2, n)))
    const padded = [...seeds]
    while (padded.length < pow2) padded.push(undefined as unknown as Seed)
    const pairs: Pair[] = []
    for (let i=0;i<pow2;i+=2) pairs.push({ a: padded[i], b: padded[i+1] })
    return pairs
}
