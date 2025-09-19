import { TMatch } from '@/types/tournament'
import { losersOnly } from './bracketMeta'

type VirtualMatch = TMatch & { __virtual?: true }

export function buildLosersDisplayColumns(all: TMatch[]): VirtualMatch[][] {
    const losers = losersOnly(all)

    const byRound = new Map<number, VirtualMatch[]>()
    for (const m of losers) {
        const arr = byRound.get(m.round) ?? []
        arr.push(m)
        byRound.set(m.round, arr)
    }
    if (byRound.size === 0) return []

    const minRound = Math.min(...Array.from(byRound.keys()))
    const col0Real = (byRound.get(minRound) ?? []).filter(m => m.isPlayIn)
    const hasL0 = col0Real.length > 0

    if (!hasL0) {
        return Array.from([...byRound.entries()].sort((a,b)=>a[0]-b[0])).map(([,ms]) =>
            ms.slice().sort((a,b)=>a.indexInRound-b.indexInRound)
        )
    }

    const l1Round = minRound + 1
    const l1 = (byRound.get(l1Round) ?? []).slice().sort((a,b)=>a.indexInRound-b.indexInRound)

    const hasPrevFor = new Set<string>()
    for (const m of losers) {
        if (m.nextMatchId && m.nextMatchSlot) {
            hasPrevFor.add(`${m.nextMatchId}::${m.nextMatchSlot}`)
        }
    }

    const col0Slots: Array<VirtualMatch | null> = Array(2 * l1.length).fill(null)

    for (const m of col0Real) {
        if (!m.nextMatchId || !m.nextMatchSlot) {
            const idx = col0Slots.findIndex(x => x === null)
            if (idx >= 0) col0Slots[idx] = m
            continue
        }
        const target = l1.findIndex(x => x.id === m.nextMatchId)
        if (target === -1) {
            const idx = col0Slots.findIndex(x => x === null)
            if (idx >= 0) col0Slots[idx] = m
            continue
        }
        const pos = m.nextMatchSlot === 'A' ? target * 2 : target * 2 + 1
        col0Slots[pos] = { ...m, indexInRound: pos }
    }

    for (let i = 0; i < l1.length; i++) {
        const m = l1[i]
        if (!hasPrevFor.has(`${m.id}::A`)) {
            const pos = i * 2
            if (!col0Slots[pos]) {
                col0Slots[pos] = {
                    id: `virtual-l0-${m.id}-A`,
                    round: minRound,
                    indexInRound: pos,
                    participantAId: m.participantAId ?? null,
                    participantBId: null,
                    winnerParticipantId: m.participantAId ?? null,
                    teamAId: null,
                    teamBId: null,
                    winnerTeamId: null,
                    nextMatchId: m.id,
                    nextMatchSlot: 'A',
                    scoreA: 1,
                    scoreB: 0,
                    isBye: true,
                    isPlayIn: true,
                    bestOf: 1,
                    bracket: 'LOSERS',
                    __virtual: true,
                }
            }
        }
        if (!hasPrevFor.has(`${m.id}::B`)) {
            const pos = i * 2 + 1
            if (!col0Slots[pos]) {
                col0Slots[pos] = {
                    id: `virtual-l0-${m.id}-B`,
                    round: minRound,
                    indexInRound: pos,
                    participantAId: m.participantBId ?? null,
                    participantBId: null,
                    winnerParticipantId: m.participantBId ?? null,
                    teamAId: null,
                    teamBId: null,
                    winnerTeamId: null,
                    nextMatchId: m.id,
                    nextMatchSlot: 'B',
                    scoreA: 1,
                    scoreB: 0,
                    isBye: true,
                    isPlayIn: true,
                    bestOf: 1,
                    bracket: 'LOSERS',
                    __virtual: true,
                }
            }
        }
    }

    const col0 = col0Slots.filter(Boolean) as VirtualMatch[]
    col0.sort((a,b)=>a.indexInRound - b.indexInRound).forEach((m, i) => (m.indexInRound = i))

    const restColumns: VirtualMatch[][] = []
    const sortedRounds = Array.from(byRound.keys()).sort((a,b)=>a-b)
    for (const r of sortedRounds) {
        if (r === minRound) continue
        const col = (byRound.get(r) ?? []).slice().sort((a,b)=>a.indexInRound-b.indexInRound)
        restColumns.push(col)
    }

    return [col0, ...restColumns]
}
