import {TMatch, TTournament} from "@/types/tournament"
import {useMutation, useQueryClient} from "@tanstack/react-query"
import {toast} from "sonner"
import {type PrizeBadge, VersusCard} from "@/components/match/VersusCard"
import {errMsg} from "@/lib/error";

function prizeForMatchUI(m: TMatch, t: TTournament, hasWinnersR0: boolean): PrizeBadge {
    const inWinners = (m.bracket ?? 'WINNERS') === 'WINNERS'
    const isFinal = !m.nextMatchId
    if (inWinners) {
        if (hasWinnersR0 && m.round === 1) return undefined
        if (isFinal) return { amount: t.mainPrize, tone: 'final' }
        return { amount: t.matchWinPrize, tone: 'normal' }
    } else {
        if (m.isPlayIn) return undefined
        if (isFinal) return { amount: t.consolationPrize, tone: 'final' }
        return { amount: t.matchWinPrize, tone: 'normal' }
    }
}

async function patchBestOf(matchId: string, bestOf: 1 | 3 | 5) {
    const res = await fetch(`/api/matches/${matchId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bestOf }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data?.message || 'BO update failed')
    return data
}

async function resetMatch(matchId: string) {
    const res = await fetch(`/api/matches/${matchId}/revert`, { method: 'POST' })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data?.message || 'Reset failed')
    return data
}

export default function TeamVersusCardRow({
                                              match,
                                              tournament,
                                              canEdit,
                                              hasWinnersR0,
                                              onReport,
                                              furthestActiveMatchIdByParticipant,
                                          }: {
    match: TMatch
    tournament: TTournament & {
        _dpRemainingByParticipant?: Record<string, number>
        _payoutDoubledByMatchAndParticipant?: Record<string, Record<string, boolean>>
    }
    canEdit: boolean
    hasWinnersR0: boolean
    onReport: (w: 'A' | 'B', scoreA?: number, scoreB?: number) => void
    furthestActiveMatchIdByParticipant: Record<string, string>
}) {
    const qc = useQueryClient()
    const decided = !!match.winnerTeamId
    const winnerSide: 'A' | 'B' | null = decided
        ? match.winnerTeamId === match.teamAId ? 'A' : 'B'
        : null

    const teamA = tournament.teams.find((x) => x.id === match.teamAId)
    const teamB = tournament.teams.find((x) => x.id === match.teamBId)
    const teamAName = teamA?.name ?? '—'
    const teamBName = teamB?.name ?? '—'

    const isFinal = !match.nextMatchId
    const prize = prizeForMatchUI(match, tournament, hasWinnersR0)

    const doubledMapForMatch = tournament._payoutDoubledByMatchAndParticipant?.[match.id] ?? {}
    const dpMap = tournament._dpRemainingByParticipant ?? {}

    const membersA = (teamA?.members ?? []).map(m => ({
        id: m.participant.id,
        name: m.participant.name,
        dpRemaining: dpMap[m.participant.id] ?? 0,
        doubledThisMatch: doubledMapForMatch[m.participant.id],
    }))
    const membersB = (teamB?.members ?? []).map(m => ({
        id: m.participant.id,
        name: m.participant.name,
        dpRemaining: dpMap[m.participant.id] ?? 0,
        doubledThisMatch: doubledMapForMatch[m.participant.id],
    }))

    const boMut = useMutation({
        mutationFn: (bo: 1 | 3 | 5) => patchBestOf(match.id, bo),
        onSuccess: () => { toast.success('Zmieniono BO'); qc.invalidateQueries() },
        onError: (e) => toast.error(errMsg(e)),
    })

    const resetMut = useMutation({
        mutationFn: () => resetMatch(match.id),
        onSuccess: () => { toast.success('Cofnięto wynik'); qc.invalidateQueries() },
        onError: (e) => toast.error(errMsg(e)),
    })

    const winnerDoubledCount =
        decided && winnerSide === 'A'
            ? membersA.filter(m => m.doubledThisMatch).length
            : decided && winnerSide === 'B'
                ? membersB.filter(m => m.doubledThisMatch).length
                : 0

    return (
        <VersusCard
            matchId={match.id}
            sideALabel={teamAName}
            sideBLabel={teamBName}
            decided={decided}
            winnerSide={winnerSide}
            canEdit={canEdit}
            bestOf={(match.bestOf as 1 | 3 | 5) ?? 1}
            isBye={!!match.isBye}
            prize={prize}
            isTeam={true}
            matchIsFinal={isFinal}
            sideAMembers={membersA}
            sideBMembers={membersB}
            winnerDoubledCount={winnerDoubledCount}
            scoreA={match.scoreA ?? 0}
            scoreB={match.scoreB ?? 0}
            onReportAction={(w, a, b) => onReport(w, a, b)}
            onResetAction={() => resetMut.mutate()}
            onChangeBestOfAction={(bo) => boMut.mutate(bo)}
            furthestActiveMatchIdByParticipant={furthestActiveMatchIdByParticipant}
        />
    )
}
