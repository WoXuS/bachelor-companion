'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import {  useState } from 'react'
import { toast } from 'sonner'
import { getAdmin } from '@/hooks/useAdmin'
import { ApiError, CreateTournamentPayload, TournamentListItemDto } from '@/types/api'
import { CustomLoader } from '@/components/ui/CustomLoader'
import { DuelDto } from '@/types/duel'
import { computeTournamentStatus } from './[id]/utils/summary'
import {EditTournamentDialog} from "./components/EditTournamentDialog";
import {NewDuelDialog, NewTournamentDialog} from "./components/CreateNewDialogs";

async function fetchTournaments(): Promise<TournamentListItemDto[]> {
    const res = await fetch('/api/tournaments')
    if (!res.ok) throw new Error('Load failed')
    return res.json()
}

async function fetchDuels(): Promise<DuelDto[]> {
    const res = await fetch('/api/duels')
    if (!res.ok) throw new Error('Load failed')
    return res.json()
}

async function createTournament(payload: CreateTournamentPayload): Promise<TournamentListItemDto> {
    const res = await fetch('/api/tournaments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error((data as ApiError)?.message || 'Create failed')
    return data
}

async function createDuel(payload: { title: string; stake: number; playerAId: string; playerBId: string }) {
    const res = await fetch('/api/duels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error((data as ApiError)?.message || 'Create failed')
    return data as DuelDto
}

export default function TournamentsPage() {
    const qc = useQueryClient()
    const { data: me } = useQuery({ queryKey: ['me'], queryFn: getAdmin })
    const isAdmin = !!me?.isAdmin

    const { data: tournaments = [], isLoading: tLoading } = useQuery({ queryKey: ['tournaments'], queryFn: fetchTournaments })
    const { data: duels = [], isLoading: dLoading } = useQuery({ queryKey: ['duels'], queryFn: fetchDuels })

    const [tab, setTab] = useState<'tournaments' | 'duels'>('tournaments')

    const createTournamentMut = useMutation({ mutationFn: createTournament, onSuccess: () => {
            toast.success('Turniej utworzony'); qc.invalidateQueries({ queryKey: ['tournaments'] })
        }, onError: (e: any) => toast.error(e.message) })

    const createDuelMut = useMutation({ mutationFn: createDuel, onSuccess: () => {
            toast.success('Pojedynek dodany'); qc.invalidateQueries({ queryKey: ['duels'] })
        }, onError: (e: any) => toast.error(e.message) })

    if (tLoading || dLoading) return <CustomLoader/>
    console.log(tournaments)

    return (
        <div className="max-w-4xl mx-auto p-6 space-y-6 pt-20">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">Turnieje</h1>
                <div className="flex gap-2">
                    {isAdmin && tab === 'tournaments' && <NewTournamentDialog onCreate={(p) => createTournamentMut.mutate(p)} />}
                    {isAdmin && tab === 'duels' && <NewDuelDialog onCreate={(p) => createDuelMut.mutate(p)} />}
                </div>
            </div>

            <div className="flex gap-2">
                <Button variant={tab==='tournaments'?'default':'outline'} onClick={()=>setTab('tournaments')}>Drabinki</Button>
                <Button variant={tab==='duels'?'default':'outline'} onClick={()=>setTab('duels')}>Pojedynki 1v1</Button>
            </div>
            {tab === 'tournaments' ? (
                tournaments.length ? (
                    <ul className="space-y-3">
                        {tournaments.map((t) => {
                            const { status, currentRoundLabel, finished } = computeTournamentStatus(t)
                            return (
                                <li key={t.id} className="flex items-center justify-between rounded-lg border p-3 bg-white/5">
                                    <div className="flex flex-col gap-1">
                                        <div className="font-semibold">{t.title}</div>
                                        <div className="text-xs text-gray-400"><span className={`${finished ? 'text-emerald-400' : 'text-orange-400'}`}>{status}</span> — {currentRoundLabel}</div>
                                        <div className="text-sm text-gray-400 flex gap-4 flex-wrap">
                                            <span>Główna: {t.mainPrize}</span>
                                            <span>Za mecz: {t.matchWinPrize}</span>
                                            {typeof t.consolationPrize === 'number' && t.consolationPrize > 0 && (
                                                <span>Losers: {t.consolationPrize}</span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Button asChild size="sm">
                                            <Link href={`/tournaments/${t.id}`}>Otwórz</Link>
                                        </Button>
                                        {isAdmin && <EditTournamentDialog tournamentId={t.id} />}
                                    </div>
                                </li>
                            )
                        })}
                    </ul>
                ) : <p className="text-destructive">Brak turniejów do wyświetlenia.</p>
            ) : (
                duels.length ? (
                    <ul className="space-y-3">
                        {duels.map((d) => (
                            <li key={d.id} className="flex items-center justify-between rounded-lg border p-3 bg-white/5">
                                <div className="flex flex-col gap-1">
                                    <div className="font-semibold">{d.title}</div>
                                    <div className="text-xs text-gray-400">Stawka: {d.stake}</div>
                                    <div className="text-sm text-gray-400">
                                        {d.playerA?.name ?? '—'} vs {d.playerB?.name ?? '—'}
                                    </div>
                                    <div className={`text-xs ${d.finishedAt ? 'text-emerald-400' : 'text-orange-400'}`}>
                                        {d.finishedAt ? `Wygrany: ${d.winner?.name ?? '—'}` : 'W toku'}
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Button asChild size="sm">
                                        <Link href={`/duels/${d.id}`}>Otwórz</Link>
                                    </Button>
                                </div>
                            </li>
                        ))}
                    </ul>
                ) : <p className="text-destructive">Brak pojedynków do wyświetlenia.</p>
            )}
        </div>
    )
}
