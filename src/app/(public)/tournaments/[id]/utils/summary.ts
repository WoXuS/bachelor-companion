import { TournamentListItemDto } from '@/types/api'

export function winnerName(t: TournamentListItemDto): string | null {
    const last = t.matches?.length ? t.matches[t.matches.length - 1] : null
    if (!last) return null

    const isSolo = !!(last.participantAId || last.participantBId)
    if (isSolo && last.winnerParticipantId) {
        return t.participants.find(p => p.participantId === last.winnerParticipantId)?.participant?.name ?? null
    }
    if (!isSolo && last.winnerTeamId) {
        return t.teams.find(team => team.id === last.winnerTeamId)?.name ?? null
    }
    return null
}

function hasWinnersPlayIn(matches: TournamentListItemDto['matches']): boolean {
    if (!matches?.length) return false
    const minRound = Math.min(...matches.map(m => m.round))
    return matches.some(m => m.round === minRound && m.isBye)
}

export function computeTournamentStatus(t: TournamentListItemDto) {
    const ms = t.matches ?? []
    if (ms.length === 0) {
        return { status: 'Nie rozpoczęty', currentRoundLabel: '—', finished: false }
    }

    const openRound = ms.find(m => !m.winnerParticipantId && !m.winnerTeamId)?.round ?? null

    const final = ms[ms.length - 1]
    const finished = !!final && !!(final.winnerParticipantId || final.winnerTeamId)

    if (finished) {
        const wn = winnerName(t)
        const isTeam = !!final.winnerTeamId;
        return { status: 'Zakończony', currentRoundLabel: wn ? `${isTeam ? 'Wygrali' : "Wygrał"}: ${wn}` : `${isTeam ? 'Wygrali' : "Wygrał"}: —`, finished: true }
    }

    if (openRound == null) {
        return { status: 'W toku', currentRoundLabel: '—', finished: false }
    }

    const playIn = hasWinnersPlayIn(ms)
    const minRound = Math.min(...ms.map(m => m.round))

    if (openRound === minRound && playIn) {
        return { status: 'W toku', currentRoundLabel: 'Runda kwalifikacyjna', finished: false }
    }

    const logical = openRound - (playIn ? 1 : 0)
    return { status: 'W toku', currentRoundLabel: `Runda ${logical}`, finished: false }
}
