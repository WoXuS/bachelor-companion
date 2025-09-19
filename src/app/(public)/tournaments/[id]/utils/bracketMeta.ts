import {TMatch} from "@/types/tournament";

export type BracketKind = "WINNERS" | "LOSERS" | "GRAND_FINAL"

export function winnersOnly(ms: TMatch[]) { return ms.filter(m => (m.bracket ?? 'WINNERS') === 'WINNERS') }
export function losersOnly(ms: TMatch[])  { return ms.filter(m => m.bracket === 'LOSERS') }

export function groupMatchesByRound(matches: TMatch[]) {
    const sorted = [...matches].sort((a,b) => a.round === b.round ? a.indexInRound - b.indexInRound : a.round - b.round)
    const rounds: TMatch[][] = []
    let cur = -1
    for (const m of sorted) {
        if (m.round !== cur) { rounds.push([]); cur = m.round }
        rounds[rounds.length - 1].push(m)
    }
    return rounds
}


export function hasWinnersPlayIn(matches: TMatch[]): boolean {
    const wins = winnersOnly(matches)
    if (!wins.length) return false
    const minRound = Math.min(...wins.map(m => m.round))
    const r0 = wins.filter(m => m.round === minRound)

    return r0.some(m => !!m.isBye)
}

export function roundTitle(matches: TMatch[], bracket: BracketKind, roundIndex: number, totalColumns: number): string {
    const grouped = groupMatchesByRound(bracket === 'WINNERS' ? winnersOnly(matches) : losersOnly(matches))
    const column = grouped[roundIndex]
    if (!column?.length) return 'Runda'
    const isFinalColumn = roundIndex === totalColumns - 1
    if (isFinalColumn) return 'Finał'

    if (bracket === 'WINNERS') {
        const hasR0 = hasWinnersPlayIn(matches)
        if (roundIndex === 0 && hasR0) return 'Runda kwalifikacyjna'
        const num = hasR0 ? column[0].round - 1 : column[0].round
        return `Runda ${num}`
    }

    if (roundIndex === 0 && column.some(m => m.isPlayIn)) return 'Kwalifikacja'
    return `Runda ${column[0].round}`
}

