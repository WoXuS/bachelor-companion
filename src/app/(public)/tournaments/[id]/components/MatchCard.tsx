'use client'
import * as React from 'react'
import {Button} from '@/components/ui/button'
import {Input} from '@/components/ui/input'
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import {useMutation, useQueryClient} from '@tanstack/react-query'
import {toast} from 'sonner'
import {computePrizeInfo} from '../utils/prize'
import {TMatch, TTournament} from "@/types/tournament";
import {Dialog, DialogContent, DialogHeader, DialogTitle} from "@/components/ui/dialog";
import {RefreshCw} from "lucide-react";

const winsNeeded = (bestOf?: number) => Math.ceil((bestOf ?? 1) / 2)

export function MatchCard({
                              match, tournament, canEdit, roundNumber,
                              onReportAction, hasWinnersPlayInRound0
                          }: {
    match: TMatch
    tournament: TTournament
    canEdit: boolean
    roundNumber: number
    onReportAction: (w: 'A' | 'B', scoreA?: number, scoreB?: number) => void
    hasWinnersPlayInRound0?: boolean
}) {
    const isSolo = tournament.type === 'SOLO'
    const decided = !!(match.winnerParticipantId || match.winnerTeamId)
    const winnerSide: 'A' | 'B' | null =
        match.winnerParticipantId
            ? (match.winnerParticipantId === match.participantAId ? 'A' : match.participantBId ? 'B' : null)
            : null

    const nameA = tournament.type === 'SOLO'
        ? (tournament.participants.find(p => p.participantId === match.participantAId)?.participant?.name ?? '—')
        : (tournament.teams.find(x => x.id === match.teamAId)?.name ?? '—')
    const nameB = tournament.type === 'SOLO'
        ? (tournament.participants.find(p => p.participantId === match.participantBId)?.participant?.name ?? '—')
        : (tournament.teams.find(x => x.id === match.teamBId)?.name ?? '—')

    const [scoreA, setScoreA] = React.useState<number>(match.scoreA ?? 0)
    const [scoreB, setScoreB] = React.useState<number>(match.scoreB ?? 0)
    const [confirm, setConfirm] = React.useState<{ open: boolean; winner: 'A' | 'B' | null }>({
        open: false,
        winner: null
    })
    React.useEffect(() => {
        setScoreA(match.scoreA ?? 0);
        setScoreB(match.scoreB ?? 0)
    }, [match.scoreA, match.scoreB])

    const need = winsNeeded(match.bestOf)
    const tryConfirmAutoWin = (side: 'A' | 'B', nextA: number, nextB: number) => {
        if (decided) return
        const sA = side === 'A' ? nextA : scoreA
        const sB = side === 'B' ? nextB : scoreB
        if ((side === 'A' && sA >= need && sA > sB) || (side === 'B' && sB >= need && sB > sA)) {
            setConfirm({open: true, winner: side})
        }
    }
    const onChangeA = (v: number) => {
        const inc = v > scoreA;
        setScoreA(v);
        if (inc) tryConfirmAutoWin('A', v, scoreB)
    }
    const onChangeB = (v: number) => {
        const inc = v > scoreB;
        setScoreB(v);
        if (inc) tryConfirmAutoWin('B', scoreA, v)
    }

    const qc = useQueryClient()
    const patchBestOf = async (bestOf: 1 | 3 | 5) => {
        const res = await fetch(`/api/matches/${match.id}`, {
            method: 'PATCH',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({bestOf})
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data?.message || 'BO update failed')
        return data
    }
    const resetMatch = async () => {
        const res = await fetch(`/api/matches/${match.id}/revert`, {method: 'POST'})
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data?.message || 'Reset failed')
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
    const resetMut = useMutation({
        mutationFn: () => resetMatch(),
        onSuccess: () => {
            toast.success('Cofnięto wynik');
            qc.invalidateQueries()
        },
        onError: (e: any) => toast.error(e.message),
    })

    const isWinnersR0 = (match.bracket ?? 'WINNERS') === 'WINNERS' && match.round === 1 && hasWinnersPlayInRound0
    const prize = (() => {
        const isLosers = (match.bracket ?? 'WINNERS') === 'LOSERS'
        const isFinal  = !match.nextMatchId
        if (isLosers) {
            if (isFinal) return { amount: tournament.consolationPrize }
            if (match.isPlayIn) return
            return { amount: tournament.matchWinPrize }
        } else {
            if (isFinal) return { amount: tournament.mainPrize }
            const isWinnersR0 = hasWinnersPlayInRound0 && match.round === 1
            if (isWinnersR0) return
            return { amount: tournament.matchWinPrize }
        }
    })()


    const [cardHeight, setCardHeight] = React.useState<number>(0)
    const cardRef = React.useRef<HTMLDivElement>(null)
    React.useLayoutEffect(() => {
        if (cardRef.current) setCardHeight(cardRef.current.getBoundingClientRect().height)
    }, [])

    return (
        <div className={roundNumber != 1 ? 'flex items-center' : ''}
             style={roundNumber !== 1 ? {height: `${2 ** (roundNumber - 1) * cardHeight + (2 ** (roundNumber - 1) - 1) * 12}px`} : undefined}>
            <div
                className={`rounded-lg border bg-white/5 p-2 flex flex-col gap-2 min-w-[160px] ${match.nextMatchId ? '' : 'border-amber-400'} ${roundNumber !== 1 ? 'w-full' : ''}`}
                ref={cardRef}>
                <div className="flex items-center justify-between">
                    {canEdit ? (
                        <div className="text-xs text-gray-400 flex items-center gap-2">
                            BO
                            {!decided ? (
                                <Select onValueChange={(v) => updateBoMut.mutate(Number(v) as 1 | 3 | 5)}
                                        value={String(match.bestOf)}>
                                    <SelectTrigger className="text-xs gap-1 p-1 py-0 h-[16px_!important]"><SelectValue/></SelectTrigger>
                                    <SelectContent><SelectItem value='1'>1</SelectItem><SelectItem
                                        value='3'>3</SelectItem><SelectItem value='5'>5</SelectItem></SelectContent>
                                </Select>
                            ) : (String(match.bestOf))}
                        </div>
                    ) : (<span className="text-xs text-gray-400">BO{match.bestOf}</span>)}

                    {match.isBye ? (
                        <span className="text-xs text-blue-400/40">auto-awans</span>
                    ) : prize && (decided ? (
                        <span className={`text-xs ${match.nextMatchId ? 'text-emerald-400' : 'text-amber-500/70'}`}>
              +{prize.amount} $pruch
            </span>
                    ) : (
                        <span className="text-xs text-gray-500">{prize.amount} $pruch</span>
                    ))}
                </div>

                <div
                    className={`font-medium text-sm rounded-lg bg-white/10 flex gap-2 items-center pr-2 ${match.isBye ? 'ring-1 ring-blue-400' : winnerSide === 'A' ? match.nextMatchId ? 'ring-1 ring-emerald-400' : 'ring-1 ring-amber-400' : ''}`}>
                    {isSolo && !decided && canEdit && ((match.participantBId && match.participantAId) || (match.teamBId && match.teamAId)) ? (
                        <Input type="number" min={0} value={scoreA} inputMode="numeric"
                               onChange={(e) => onChangeA(Number(e.target.value))}
                               className="w-[25px] h-[20px] my-1 ml-2 px-0 text-xs py-0 text-center [&::-webkit-inner-spin-button]:appearance-none"/>
                    ) : (<span className="bg-white/7 py-1 rounded-s-lg flex w-[30px] justify-center">{scoreA}</span>)}
                    <span className="text-sm">{nameA}</span>
                    {winnerSide === 'A' && !match.isBye && <Button className="ml-auto" size="icon" variant="destructive" onClick={() => {
                        resetMut.mutate()
                    }}>
                        <RefreshCw size="16"/>
                    </Button>}
                </div>

                <div
                    className={`font-medium text-sm rounded-lg bg-white/10 flex gap-2 items-center pr-2 ${winnerSide === 'B' ? match.nextMatchId ? 'ring-1 ring-emerald-400' : 'ring-1 ring-amber-400' : ''}`}>
                    {isSolo && !decided && canEdit && ((match.participantBId && match.participantAId) || (match.teamBId && match.teamAId)) ? (
                        <Input type="number" min={0} value={scoreB} onChange={(e) => onChangeB(Number(e.target.value))}
                               className="w-[25px] h-[20px] my-1 ml-2 px-0 text-xs py-0 text-center [&::-webkit-inner-spin-button]:appearance-none"/>
                    ) : (<span className="bg-white/7 py-1 rounded-s-lg flex w-[30px] justify-center">{scoreB}</span>)}
                    <span className="text-sm">{nameB}</span>
                    {winnerSide === 'B' && <Button className="ml-auto" size="icon" variant="destructive" onClick={() => {
                        resetMut.mutate()
                    }}>
                        <RefreshCw size="16"/>
                    </Button>}
                </div>

                <Dialog open={confirm.open} onOpenChange={(o) => setConfirm(s => ({...s, open: o}))}>
                    <DialogContent>
                        <DialogHeader><DialogTitle>{confirm.winner ? `Czy ten mecz wygrał ${confirm.winner === 'A' ? nameA : nameB}?` : 'Potwierdź zwycięzcę'}</DialogTitle></DialogHeader>
                        <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => {
                                if (confirm.winner === 'A') setScoreA(v => Math.max(0, v - 1));
                                if (confirm.winner === 'B') setScoreB(v => Math.max(0, v - 1));
                                setConfirm({open: false, winner: null})
                            }}>Nie</Button>
                            <Button onClick={() => {
                                if (!confirm.winner) return;
                                onReportAction(confirm.winner, scoreA, scoreB);
                                toast.success('Zapisano wynik', {
                                    action: {
                                        label: 'Cofnij',
                                        onClick: () => resetMut.mutate()
                                    }
                                });
                                setConfirm({open: false, winner: null})
                            }}>Tak</Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>
        </div>
    )
}
