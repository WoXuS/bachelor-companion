'use client'

import * as React from 'react'
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query'
import {toast} from 'sonner'
import {CustomLoader} from '@/components/ui/CustomLoader'
import {VersusCard} from '@/components/match/VersusCard'
import {DuelDto} from '@/types/duel'
import {getAdmin} from '@/hooks/useAdmin'
import {useParams} from 'next/navigation'

async function fetchDuel(id: string): Promise<DuelDto> {
    const r = await fetch(`/api/duels/${id}`)
    const j = await r.json()
    if (!r.ok) throw new Error(j?.message || 'Load failed')
    return j
}

async function reportDuel(id: string, payload: { winner: 'A' | 'B'; scoreA?: number; scoreB?: number }) {
    const r = await fetch(`/api/duels/${id}/report`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(payload),
    })
    const j = await r.json().catch(() => ({}))
    if (!r.ok) throw new Error(j?.message || 'Report failed')
    return j
}


async function resetDuel(id: string) {
    const r = await fetch(`/api/duels/${id}/revert`, {method: 'POST'})
    const j = await r.json().catch(() => ({}))
    if (!r.ok) throw new Error(j?.message || 'Reset failed')
    return j
}

export default function DuelDetailPage() {
    const {id} = useParams() as { id: string }
    const qc = useQueryClient()
    const {data: me} = useQuery({queryKey: ['me'], queryFn: getAdmin})
    const isAdmin = !!me?.isAdmin

    const {data: duel, isLoading} = useQuery({queryKey: ['duel', id], queryFn: () => fetchDuel(id)})

    const reportMut = useMutation({
        mutationFn: (payload: { winner: 'A' | 'B'; scoreA?: number; scoreB?: number }) => reportDuel(id, payload),
        onSuccess: () => {
            toast.success('Zapisano wynik')
            qc.invalidateQueries({queryKey: ['duel', id]})
            qc.invalidateQueries({queryKey: ['participants']})
            qc.invalidateQueries({queryKey: ['transactions']})
        },
        onError: (e: any) => toast.error(e.message),
    })

    const resetMut = useMutation({
        mutationFn: () => resetDuel(id),
        onSuccess: () => {
            toast.success('Cofnięto wynik')
            qc.invalidateQueries({queryKey: ['duel', id]})
            qc.invalidateQueries({queryKey: ['participants']})
            qc.invalidateQueries({queryKey: ['transactions']})
        },
        onError: (e: any) => toast.error(e.message),
    })

    const patchBestOf = async (bestOf: 1 | 3 | 5) => {
        const res = await fetch(`/api/duels/${id}`, {
            method: 'PATCH',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({bestOf})
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data?.message || 'BO update failed')
        return data
    }

    const updateBoMut = useMutation({
        mutationFn: (bo: 1 | 3 | 5) => patchBestOf(bo),
        onSuccess: () => {
            toast.success('Zmieniono BO');
            qc.invalidateQueries()
        },
        onError: (e: any) => toast.error(e.message),
    })

    if (isLoading || !duel) return <CustomLoader/>

    const decided = !!duel.winnerId
    const winnerSide: 'A' | 'B' | null =
        duel.winnerId ? (duel.winnerId === duel.playerAId ? 'A' : 'B') : null

    const nameA = duel.playerA?.name ?? '—'
    const nameB = duel.playerB?.name ?? '—'

    const prize = {amount: duel.stake, tone: 'normal' as const}

    return (
        <div className="max-w-3xl mx-auto pb-6 px-4 space-y-1 pt-20">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">1v1: {duel.title}</h1>
                </div>
            </div>

            <div className="flex gap-6">
                <VersusCard
                    sideALabel={nameA}
                    sideBLabel={nameB}
                    decided={decided}
                    winnerSide={winnerSide}
                    canEdit={isAdmin}
                    bestOf={(duel.bestOf as 1 | 3 | 5) ?? 1}
                    isBye={false}
                    prize={prize}
                    scoreA={duel.scoreA ?? 0}
                    scoreB={duel.scoreB ?? 0}
                    onReportAction={(w, a, b) => reportMut.mutate({winner: w, scoreA: a, scoreB: b})}
                    onResetAction={() => resetMut.mutate()}
                    onChangeBestOfAction={async (bo) => {updateBoMut.mutate(bo)}}
                />
            </div>
        </div>
    )
}
