'use client'

import * as React from 'react'
import {useParams} from 'next/navigation'
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query'
import {Button} from '@/components/ui/button'
import {toast} from 'sonner'
import {MatchCard} from '@/components/match/MatchCard'
import EditSeedingDialog from './components/EditSeedingDialog'
import {buildLosersDisplayColumns} from './utils/losersDisplay'
import {
    winnersOnly,
    losersOnly,
    groupMatchesByRound,
    roundTitle,
    hasWinnersPlayIn,
} from './utils/bracketMeta'
import {TMatch, TTournament, TournamentType} from '@/types/tournament'
import {reseedRound1} from '@/server/db/services/tournaments.service'
import {getAdmin} from '@/hooks/useAdmin'
import {CustomLoader} from '@/components/ui/CustomLoader'
import TeamVersusCardRow from "@/app/(public)/tournaments/[id]/components/TeamVersusCardRow";
import VirtualEggButton from "@/components/easter-egg/VitualEggButton";

async function fetchTournament(id: string): Promise<TTournament & any> {
    const res = await fetch(`/api/tournaments/${id}`)
    const data = await res.json()
    if (!res.ok) throw new Error(data?.message || 'Load failed')
    return data
}

async function reportMatchAPI(
    tournamentId: string,
    payload: { matchId: string; winner: 'A' | 'B'; scoreA?: number; scoreB?: number }
) {
    const res = await fetch(`/api/tournaments/${tournamentId}/report`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(payload),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data?.message || 'Report failed')
    return data
}

async function createConsolation(tournamentId: string) {
    const res = await fetch(`/api/tournaments/${tournamentId}/consolation`, {method: 'POST'})
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data?.message || 'Consolation failed')
    return data
}

function buildFurthestActiveMatchIdByParticipant(matches: TMatch[]) {
    const map: Record<string, { round: number; matchId: string }> = {}
    for (const m of matches) {
        if (m.winnerParticipantId || m.winnerTeamId) continue
        const ids = [m.participantAId, m.participantBId].filter(Boolean) as string[]
        for (const pid of ids) {
            const curr = map[pid]
            if (!curr || (m.round ?? 0) > curr.round) {
                map[pid] = {round: m.round ?? 0, matchId: m.id}
            }
        }
    }
    const out: Record<string, string> = {}
    for (const [pid, v] of Object.entries(map)) out[pid] = v.matchId
    return out
}

export default function TournamentDetailPage() {
    const {id} = useParams() as { id: string }
    const qc = useQueryClient()
    const {data: me} = useQuery({queryKey: ['me'], queryFn: getAdmin})
    const isAdmin = !!me?.isAdmin

    const {data: tournament, isLoading} = useQuery({
        queryKey: ['tournament', id],
        queryFn: () => fetchTournament(id),
    })

    const reportMut = useMutation({
        mutationFn: (payload: { matchId: string; winner: 'A' | 'B'; scoreA?: number; scoreB?: number }) =>
            reportMatchAPI(id, payload),
        onSuccess: () => {
            toast.success('Zapisano wynik meczu')
            qc.invalidateQueries({queryKey: ['tournament', id]})
            qc.invalidateQueries({queryKey: ['ranking']})
            qc.invalidateQueries({queryKey: ['participants']})
            qc.invalidateQueries({queryKey: ['transactions']})
        },
        onError: (e: any) => toast.error(e.message),
    })

    const [tab, setTab] = React.useState<'WINNERS' | 'LOSERS'>('WINNERS')

    const furthestActiveByParticipant = React.useMemo<Record<string, string>>(() => {
        return tournament
            ? buildFurthestActiveMatchIdByParticipant(tournament.matches)
            : {};
    }, [tournament]);

    if (isLoading || !tournament) return <CustomLoader/>

    const hasR0 = hasWinnersPlayIn(tournament.matches)
    const winnersCols = groupMatchesByRound(winnersOnly(tournament.matches))
    const losersCols = buildLosersDisplayColumns(tournament.matches)
    const rounds = tab === 'WINNERS' ? winnersCols : losersCols


    const isSolo = tournament.type === TournamentType.SOLO
    const isTeam = tournament.type === TournamentType.TEAM

    return (
        <div className={`max-w-5xl mx-auto pb-6 px-4 sm:px-6 ${isSolo ? 'space-y-6' : 'space-y-1'} pt-20`}>
            <header className="flex flex-wrap items-center justify-between gap-3">
                <h1 className="text-2xl font-bold">Turniej: {tournament.title}, <span className="text-base text-gray-400">drabinka {tab === 'WINNERS' ? 'wygranych' : 'przegranych'}</span></h1>
                <div className="flex flex-wrap items-center gap-2">
                    {isSolo && (
                        <Button onClick={() => setTab(tab === 'WINNERS' ? 'LOSERS' : 'WINNERS')}>
                            Pokaż drabinkę {tab === 'WINNERS' ? 'przegranych' : 'wygranych'}
                        </Button>
                    )}
                    {isAdmin && tab === 'LOSERS' && losersOnly(tournament.matches).length === 0 && (
                        <Button
                            variant="secondary"
                            onClick={() => {
                                createConsolation(tournament.id)
                                    .then(() => {
                                        toast.success('Wygenerowano drabinkę przegranych')
                                        qc.invalidateQueries({queryKey: ['tournament', id]})
                                    })
                                    .catch((e) => toast.error(e.message))
                            }}
                        >
                            Generuj drabinkę przegranych
                        </Button>
                    )}

                    {isAdmin && tab === 'WINNERS' && isSolo && (
                        <EditSeedingDialog
                            tournament={tournament}
                            onSaved={() => qc.invalidateQueries({queryKey: ['tournament', id]})}
                            onReseed={() => {
                                reseedRound1(id)
                                    .then(() => {
                                        toast.success('Przetasowano rozstawienie (R0)')
                                        qc.invalidateQueries({queryKey: ['tournament', id]})
                                    })
                                    .catch((e) => toast.error(e.message))
                            }}
                        />
                    )}
                </div>
            </header>

            {tab === 'LOSERS' && losersOnly(tournament.matches).length === 0 ? (
                <>
                    <p>
                        <span className="text-destructive">Drabinka przegranych nie została jeszce wygenerowana.</span>
                        <br/>
                        <span className="text-orange-400">
              Wszystkie mecze rundy kwalifikacyjnej i rundy pierwszej muszą zostać ukończone.
            </span>
                    </p>
                    <p>
                        Drabinka przegranych jest budowana z przegranych rund kwalifikacyjnej oraz pierwszej. Jeżeli
                        liczba graczy
                        nie jest potęgą 2, zostanie rozegrany play-in (runda kwalifikacyjna drabinki przegranych).
                    </p>
                    <VirtualEggButton placementKey="losers" className="fixed z-20 -bottom-1 -left-3"/>
                </>
            ) : (
                <div className={isSolo ? "overflow-auto" : ''}>
                    <div className="flex items-center gap-3 sm:gap-6">
                        {rounds.map((column, colIdx) => (
                            <div key={colIdx} className="flex flex-1 flex-col gap-[12px]">
                                {isSolo && <div className="text-sm font-semibold sm:text-base">
                                    {roundTitle(tournament.matches, tab, colIdx, rounds.length)}
                                </div>}
                                {column.map((match: TMatch) =>
                                    isSolo ? (
                                        <MatchCard
                                            key={match.id}
                                            match={match}
                                            tournament={tournament}
                                            canEdit={isAdmin}
                                            roundNumber={column[0]?.round}
                                            hasWinnersPlayInRound0={hasR0}
                                            onReportAction={(winner, scoreA, scoreB) =>
                                                reportMut.mutate({matchId: match.id, winner, scoreA, scoreB})
                                            }
                                            dpRemainingByParticipant={tournament._dpRemainingByParticipant}
                                            payoutDoubledByMatchId={tournament._payoutDoubledByMatchId}
                                            furthestActiveMatchIdByParticipant={furthestActiveByParticipant}
                                        />
                                    ) : (
                                        <TeamVersusCardRow
                                            key={match.id}
                                            match={match}
                                            tournament={tournament}
                                            canEdit={isAdmin}
                                            hasWinnersR0={hasR0}
                                            onReport={(winner, scoreA, scoreB) =>
                                                reportMut.mutate({matchId: match.id, winner, scoreA, scoreB})
                                            }
                                            furthestActiveMatchIdByParticipant={furthestActiveByParticipant}
                                        />
                                    )
                                )}
                            </div>
                        ))}
                    </div>
                    <VirtualEggButton placementKey="losers" className="mt-5"/>
                </div>
            )}
        </div>
    )
}
