'use client'

import * as React from 'react'
import {Button} from '@/components/ui/button'
import {Input} from '@/components/ui/input'
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select'
import {Dialog, DialogContent, DialogHeader, DialogTitle} from '@/components/ui/dialog'
import {toast} from 'sonner'
import {Crown, RefreshCw} from 'lucide-react'

type BestOf = 1 | 3 | 5
const winsNeeded = (bestOf?: number) => Math.ceil((bestOf ?? 1) / 2)

export type PrizeBadge =
    | { amount: number; tone: 'normal' | 'final' }
    | undefined

type MemberChip = {
    id: string
    name: string
    dpRemaining?: number
    doubledThisMatch?: boolean
}

type Props = {
    matchId: string // <- NOWE
    sideALabel: string
    sideBLabel: string
    decided: boolean
    winnerSide: 'A' | 'B' | null
    canEdit: boolean
    bestOf?: BestOf
    isBye?: boolean
    prize?: PrizeBadge
    isTeam?: boolean

    matchIsFinal?: boolean
    sideAMembers?: MemberChip[]
    sideBMembers?: MemberChip[]
    winnerDoubledCount?: number

    scoreA?: number | null
    scoreB?: number | null

    onChangeBestOfAction: (bo: BestOf) => Promise<any> | void
    onReportAction: (winner: 'A' | 'B', scoreA?: number, scoreB?: number) => Promise<any> | void
    onResetAction: () => Promise<any> | void

    furthestActiveMatchIdByParticipant?: Record<string, string>
}

export function VersusCard(props: Props) {
    const {
        matchId,
        sideALabel, sideBLabel, decided, winnerSide, canEdit,
        bestOf = 1, isBye = false, prize, isTeam = false,
        scoreA: sA = 0, scoreB: sB = 0,
        onChangeBestOfAction, onReportAction, onResetAction,
        sideAMembers = [],
        sideBMembers = [],
        winnerDoubledCount = 0,
        furthestActiveMatchIdByParticipant,
    } = props

    const [scoreA, setScoreA] = React.useState<number>(sA ?? 0)
    const [scoreB, setScoreB] = React.useState<number>(sB ?? 0)
    React.useEffect(() => { setScoreA(sA ?? 0); setScoreB(sB ?? 0) }, [sA, sB])

    const need = winsNeeded(bestOf)
    const [confirm, setConfirm] = React.useState<{ open: boolean; winner: 'A' | 'B' | null }>({
        open: false, winner: null,
    })

    const tryConfirmAutoWin = (side: 'A' | 'B', nextA: number, nextB: number) => {
        if (decided) return
        const a = side === 'A' ? nextA : scoreA
        const b = side === 'B' ? nextB : scoreB
        if ((side === 'A' && a >= need && a > b) || (side === 'B' && b >= need && b > a)) {
            setConfirm({open: true, winner: side})
        }
    }
    const onChangeA = (v: number) => { const inc = v > scoreA; setScoreA(v); if (inc) tryConfirmAutoWin('A', v, scoreB) }
    const onChangeB = (v: number) => { const inc = v > scoreB; setScoreB(v); if (inc) tryConfirmAutoWin('B', scoreA, v) }

    const disableBestOf = decided || !canEdit || !onChangeBestOfAction

    function shouldShowFutureDP(memberId?: string, dpRemaining?: number) {
        if (!memberId || !dpRemaining || dpRemaining <= 0) return false
        if (!furthestActiveMatchIdByParticipant) return false
        return furthestActiveMatchIdByParticipant[memberId] === matchId
    }

    function MembersChips({members}: {members: MemberChip[]}) {
        if (!isTeam || members.length === 0) return null
        return (
            <div className="ml-2 flex flex-wrap gap-1">
                {members.map(m => (
                    <span key={m.id} className="flex items-center gap-1 rounded bg-white/10 px-1.5 py-0.5 text-[10px] text-slate-200">
            {m.name}
                        {decided
                            ? (m.doubledThisMatch && (
                                <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-1 text-[9px] font-semibold text-emerald-300">×2</span>
                            ))
                            : (shouldShowFutureDP(m.id, m.dpRemaining) && (
                                <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-1 text-[9px] font-semibold text-emerald-300">
                  DP×2 • {m.dpRemaining}
                </span>
                            ))
                        }
          </span>
                ))}
            </div>
        )
    }

    return (
        <div className="flex w-full flex-col gap-10">
            <div className="flex flex-col gap-2 text-sm text-gray-400">
                <p>
                    Stawka{isTeam && ' na osobę'}: {prize?.amount} <span className="text-xs">$pruch</span> —{' '}
                    <span className={decided ? 'text-emerald-400' : 'text-orange-400'}>
            {decided ? `Wygrał: ${winnerSide === 'A' ? sideALabel : sideBLabel}` : 'W toku'}
          </span>
                    {isTeam && decided && winnerDoubledCount > 0 && (
                        <span className="ml-2 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-1.5 text-[10px] font-semibold text-emerald-300">
              ×2 ×{winnerDoubledCount}
            </span>
                    )}
                </p>

                {!decided && canEdit && (
                    <div className="flex items-center gap-2">
                        <p className="whitespace-nowrap">Pojedynek BEST OF</p>
                        <Select onValueChange={(v) => onChangeBestOfAction(Number(v) as BestOf)} value={String(bestOf)} disabled={disableBestOf}>
                            <SelectTrigger className="w-[50px] gap-1 p-2"><SelectValue/></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="1">1</SelectItem>
                                <SelectItem value="3">3</SelectItem>
                                <SelectItem value="5">5</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                )}
                {decided && <p>Pojedynek <span className="text-primary">BEST OF {bestOf}</span></p>}
            </div>

            <div className="flex flex-col items-center gap-2 sm:flex-row">
                <div className={`relative w-full sm:w-auto sm:flex-1 rounded-lg bg-white/10 pr-2 font-medium text-lg ${isBye ? 'ring-1 ring-blue-400' : winnerSide === 'A' ? 'ring-1 ring-emerald-400' : ''}`}>
                    {canEdit && !decided
                        ? <Input type="number" min={0} value={scoreA} inputMode="numeric"
                                 onChange={(e) => onChangeA(Number(e.target.value))}
                                 className="my-1 ml-2 h-[28px] w-[25px] px-0 py-1 text-center text-xs [&::-webkit-inner-spin-button]:appearance-none"/>
                        : <span className="flex w-[30px] justify-center rounded-s-lg bg-white/7 py-2 text-sm">{scoreA}</span>}
                    <span className="text-sm">{sideALabel}</span>

                    <MembersChips members={sideAMembers} />

                    {decided && (
                        <>
                            {winnerSide === 'A' && <Crown className="absolute -top-6 -right-3 rotate-[15deg]" color="#EFBF04" size={26}/>}
                            {!isTeam && (
                                <p className={`ml-auto text-xs ${winnerSide === 'B' ? 'text-destructive' : 'text-emerald-400'}`}>
                                    {winnerSide === 'B' ? '-' : '+'}{prize?.amount} $pruch
                                </p>
                            )}
                            {isTeam && winnerSide === 'A' && (
                                <p className='ml-auto text-xs text-emerald-400'>
                                    +{prize?.amount} $pruch
                                    {winnerDoubledCount > 0 && <span className="ml-1 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-1 text-[10px] font-semibold text-emerald-300">×2×{winnerDoubledCount}</span>}
                                </p>
                            )}
                        </>
                    )}

                    {winnerSide === 'A' && !isBye && onResetAction && canEdit && (
                        <Button className="ml-auto" size="icon" variant="destructive" onClick={() => onResetAction()}>
                            <RefreshCw size="16"/>
                        </Button>
                    )}
                </div>

                <p className="text-primary">vs</p>

                <div className={`relative w-full sm:w-auto sm:flex-1 rounded-lg bg-white/10 pr-2 font-medium text-sm ${winnerSide === 'B' ? 'ring-1 ring-emerald-400' : ''}`}>
                    {canEdit && !decided
                        ? <Input type="number" min={0} value={scoreB} inputMode="numeric"
                                 onChange={(e) => onChangeB(Number(e.target.value))}
                                 className="my-1 ml-2 h-[28px] w-[25px] px-0 py-0 text-center text-xs [&::-webkit-inner-spin-button]:appearance-none"/>
                        : <span className="flex w-[30px] justify-center rounded-s-lg bg-white/7 py-2">{scoreB}</span>}
                    <span className="text-sm">{sideBLabel}</span>

                    <MembersChips members={sideBMembers} />

                    {decided && (
                        <>
                            {winnerSide === 'B' && <Crown className="absolute -top-6 -right-3 rotate-[15deg]" color="#EFBF04" size={26}/>}
                            {!isTeam && (
                                <p className={`ml-auto text-xs ${winnerSide === 'B' ? 'text-emerald-400' : 'text-destructive'}`}>
                                    {winnerSide === 'B' ? '+' : '-'} {prize?.amount} $pruch
                                </p>
                            )}
                            {isTeam && winnerSide === 'B' && (
                                <p className='ml-auto text-xs text-emerald-400'>
                                    +{prize?.amount} $pruch
                                    {winnerDoubledCount > 0 && <span className="ml-1 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-1 text-[10px] font-semibold text-emerald-300">×2×{winnerDoubledCount}</span>}
                                </p>
                            )}
                        </>
                    )}

                    {winnerSide === 'B' && onResetAction && canEdit && (
                        <Button className="ml-auto" size="icon" variant="destructive" onClick={() => onResetAction()}>
                            <RefreshCw size="16"/>
                        </Button>
                    )}
                </div>
            </div>

            <Dialog open={confirm.open} onOpenChange={(o) => setConfirm(s => ({...s, open: o}))}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {confirm.winner ? `Czy ten mecz wygrał ${confirm.winner === 'A' ? sideALabel : sideBLabel}?` : 'Potwierdź zwycięzcę'}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => {
                            if (confirm.winner === 'A') setScoreA(v => Math.max(0, v - 1))
                            if (confirm.winner === 'B') setScoreB(v => Math.max(0, v - 1))
                            setConfirm({open: false, winner: null})
                        }}>Nie</Button>
                        <Button onClick={() => {
                            if (!confirm.winner) return
                            Promise.resolve(onReportAction(confirm.winner, scoreA, scoreB))
                                .then(() => toast.success('Zapisano wynik', onResetAction ? {
                                    action: {label: 'Cofnij', onClick: () => onResetAction()}
                                } : undefined))
                            setConfirm({open: false, winner: null})
                        }}>Tak</Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}
