import { TournamentListItemDto } from "@/types/api"

export function computeTournamentStatus(t: TournamentListItemDto) {
    const anyMatch = t.matches?.length ? t.matches[0] : null
    if (!anyMatch) return {status: 'Nie rozpoczęty', currentRoundLabel: '—', finished: false}

    const finished = !!(anyMatch && !anyMatch.nextMatchId && (anyMatch.winnerParticipantId || anyMatch.winnerTeamId))

    if (finished) {
        return {status: 'Zakończony', currentRoundLabel: winnerName(t), finished: true}
    }

    const r = anyMatch.round
    return {status: 'W toku', currentRoundLabel: r === 1 ? 'Runda kwalifikacyjna' : `Runda ${r - 1}`, finished: false}
}

export function winnerName(t: TournamentListItemDto) {
    const fm = t.matches?.[0]
    if (!fm) return null
    const isSolo = !!(fm.participantAId || fm.participantBId)
    if (isSolo && fm.winnerParticipantId) return '—'
    if (!isSolo && fm.winnerTeamId) return '—'
    return null
}
