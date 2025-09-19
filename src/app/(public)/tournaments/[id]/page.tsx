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

async function fetchTournament(id: string): Promise<TTournament> {
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

    if (isLoading || !tournament) return <CustomLoader/>

    const hasR0 = hasWinnersPlayIn(tournament.matches)
    const winnersCols = groupMatchesByRound(winnersOnly(tournament.matches))
    const losersCols = buildLosersDisplayColumns(tournament.matches)
    const rounds = tab === 'WINNERS' ? winnersCols : losersCols

    const isSolo = tournament.type === TournamentType.SOLO
    const isTeam = tournament.type === TournamentType.TEAM

    return (
        <div className="max-w-5xl mx-auto p-6 space-y-6 pt-20">
            <header className="flex flex-wrap items-center justify-between gap-3">
                <h1 className="text-2xl font-bold">Turniej: {tournament.title}</h1>

                <div className="flex items-center gap-2 flex-wrap">
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

{
    tab === 'LOSERS' && losersOnly(tournament.matches).length === 0 ? (
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
        </>
    ) : (
        <div className="overflow-auto">
            <div className="flex gap-3 sm:gap-6 items-center">
                {rounds.map((column, colIdx) => (
                    <div key={colIdx} className="flex flex-col flex-1 gap-[12px]">
                        <div className="font-semibold sm:text-base text-sm">
                            {roundTitle(tournament.matches, tab, colIdx, rounds.length)}
                        </div>

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
                                />
                            )
                        )}
                    </div>
                ))}
            </div>
        </div>
    )
}
</div>
)
}