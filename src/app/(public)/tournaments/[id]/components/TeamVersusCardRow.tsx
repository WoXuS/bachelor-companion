import {TMatch, TTournament} from "@/types/tournament"
import {useMutation, useQueryClient} from "@tanstack/react-query";
import {toast} from "sonner";
import {type PrizeBadge, VersusCard} from "@/components/match/VersusCard";

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
                           }: {
    match: TMatch
    tournament: TTournament
    canEdit: boolean
    hasWinnersR0: boolean
    onReport: (w: 'A' | 'B', scoreA?: number, scoreB?: number) => void
}) {
    const qc = useQueryClient()
    const decided = !!match.winnerTeamId
    const winnerSide: 'A' | 'B' | null = decided
        ? match.winnerTeamId === match.teamAId
            ? 'A'
            : 'B'
        : null

    const teamAName = tournament.teams.find((x) => x.id === match.teamAId)?.name ?? '—'
    const teamBName = tournament.teams.find((x) => x.id === match.teamBId)?.name ?? '—'

    const prize = prizeForMatchUI(match, tournament, hasWinnersR0)

    const boMut = useMutation({
        mutationFn: (bo: 1 | 3 | 5) => patchBestOf(match.id, bo),
        onSuccess: () => {
            toast.success('Zmieniono BO')
            qc.invalidateQueries()
        },
        onError: (e: any) => toast.error(e.message),
    })

    const resetMut = useMutation({
        mutationFn: () => resetMatch(match.id),
        onSuccess: () => {
            toast.success('Cofnięto wynik')
            qc.invalidateQueries()
        },
        onError: (e: any) => toast.error(e.message),
    })

    return (
        <VersusCard
            sideALabel={teamAName}
            sideBLabel={teamBName}
            decided={decided}
            winnerSide={winnerSide}
            canEdit={canEdit}
            bestOf={(match.bestOf as 1 | 3 | 5) ?? 1}
            isBye={!!match.isBye}
            prize={prize}
            scoreA={match.scoreA ?? 0}
            scoreB={match.scoreB ?? 0}
            onReportAction={(w, a, b) => onReport(w, a, b)}
            onResetAction={() => resetMut.mutate()}
            onChangeBestOfAction={(bo) => boMut.mutate(bo)}
        />
    )
}