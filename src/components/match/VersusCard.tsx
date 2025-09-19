'use client'

import * as React from 'react'
import {useMutation, useQueryClient} from '@tanstack/react-query'
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

type Props = {
    sideALabel: string
    sideBLabel: string
    decided: boolean
    winnerSide: 'A' | 'B' | null
    canEdit: boolean
    bestOf?: BestOf
    isBye?: boolean
    prize?: PrizeBadge

    scoreA?: number | null
    scoreB?: number | null

    onChangeBestOfAction: (bo: BestOf) => Promise<any> | void
    onReportAction: (winner: 'A' | 'B', scoreA?: number, scoreB?: number) => Promise<any> | void
    onResetAction: () => Promise<any> | void
}

export function VersusCard(props: Props) {
    const {
        sideALabel, sideBLabel, decided, winnerSide, canEdit,
        bestOf = 1, isBye = false, prize,
        scoreA: sA = 0, scoreB: sB = 0,
        onChangeBestOfAction, onReportAction, onResetAction,
    } = props

    const [scoreA, setScoreA] = React.useState<number>(sA ?? 0)
    const [scoreB, setScoreB] = React.useState<number>(sB ?? 0)
    React.useEffect(() => {
        setScoreA(sA ?? 0)
        setScoreB(sB ?? 0)
    }, [sA, sB])

    const need = winsNeeded(bestOf)
    const [confirm, setConfirm] = React.useState<{ open: boolean; winner: 'A' | 'B' | null }>({
        open: false,
        winner: null,
    })

    const tryConfirmAutoWin = (side: 'A' | 'B', nextA: number, nextB: number) => {
        if (decided) return
        const a = side === 'A' ? nextA : scoreA
        const b = side === 'B' ? nextB : scoreB
        if ((side === 'A' && a >= need && a > b) || (side === 'B' && b >= need && b > a)) {
            setConfirm({open: true, winner: side})
        }
    }
    const onChangeA = (v: number) => {
        const inc = v > scoreA
        setScoreA(v)
        if (inc) tryConfirmAutoWin('A', v, scoreB)
    }
    const onChangeB = (v: number) => {
        const inc = v > scoreB
        setScoreB(v)
        if (inc) tryConfirmAutoWin('B', scoreA, v)
    }


    const disableBestOf = decided || !canEdit || !onChangeBestOfAction

    return (
        <div className="flex flex-col gap-10 w-full">
            <div className="text-sm text-gray-400">
                {!decided && canEdit && (
                    <div className="flex gap-2 items-center">
                        <p className="whitespace-nowrap">Pojedynek BEST OF</p>
                        <Select
                            onValueChange={(v) => onChangeBestOfAction(Number(v) as BestOf)}
                            value={String(bestOf)}
                            disabled={disableBestOf}
                        >
                            <SelectTrigger className="gap-1 p-2 w-[50px]"><SelectValue/></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="1">1</SelectItem>
                                <SelectItem value="3">3</SelectItem>
                                <SelectItem value="5">5</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                )}
                {decided &&
                    <p>Pojedynek <span className="text-primary">BEST OF {bestOf}</span></p>
                }
            </div>

            <div className="flex gap-2 items-center flex-col sm:flex-row">
                <div
                    className={`relative w-full sm:w-auto sm:flex-1 font-medium text-lg rounded-lg bg-white/10 flex gap-2 items-center pr-2 ${isBye ? 'ring-1 ring-blue-400' : winnerSide === 'A' ? 'ring-1 ring-emerald-400' : ''}`}>
                    {canEdit && !decided
                        ? <Input type="number" min={0} value={scoreA} inputMode="numeric"
                                 onChange={(e) => onChangeA(Number(e.target.value))}
                                 className="w-[25px] h-[28px] my-1 ml-2 px-0 text-xs py-1 text-center [&::-webkit-inner-spin-button]:appearance-none"/>
                        : <span
                            className="bg-white/7 py-2 rounded-s-lg text-sm flex w-[30px] justify-center">{scoreA}</span>}
                    <span className="text-sm">{sideALabel}</span>
                    {decided && (
                        <>
                            {winnerSide === 'A' &&
                                <Crown className="absolute -top-6 -right-3 transform-[rotate(15deg)]" color="#EFBF04"
                                       size={26}/>}
                            <p className={`text-xs ${winnerSide === 'B' ? 'text-destructive' : 'text-emerald-400'} ml-auto`}>
                                {winnerSide === 'B' ? '-' : '+'}{prize?.amount} $pruch
                            </p>
                        </>
                    )}
                    {winnerSide === 'A' && !isBye && onResetAction && canEdit && (
                        <Button className="ml-auto" size="icon" variant="destructive" onClick={() => onResetAction()}>
                            <RefreshCw size="16"/>
                        </Button>
                    )}
                </div>

                <p className="text-primary">vs</p>

                <div
                    className={`relative w-full sm:w-auto sm:flex-1 font-medium text-sm rounded-lg bg-white/10 flex gap-2 items-center pr-2 ${winnerSide === 'B' ? 'ring-1 ring-emerald-400' : ''}`}>
                    {canEdit && !decided
                        ? <Input type="number" min={0} value={scoreB} inputMode="numeric"
                                 onChange={(e) => onChangeB(Number(e.target.value))}
                                 className="w-[25px] h-[28px] my-1 ml-2 px-0 text-xs py-0 text-center [&::-webkit-inner-spin-button]:appearance-none"/>
                        : <span className="bg-white/7 py-2 rounded-s-lg flex w-[30px] justify-center">{scoreB}</span>}
                    <span className="text-sm">{sideBLabel}</span>
                    {decided && (
                        <>
                            {winnerSide === 'B' &&
                                <Crown className="absolute -top-6 -right-3 transform-[rotate(15deg)]" color="#EFBF04"
                                       size={26}/>}
                            <p className={`text-xs ${winnerSide === 'A' ? 'text-destructive' : 'text-emerald-400'} ml-auto`}>
                                {winnerSide === 'A' ? '-' : '+'} {prize?.amount} $pruch
                            </p>
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
                    <DialogHeader><DialogTitle>
                        {confirm.winner ? `Czy ten mecz wygrał ${confirm.winner === 'A' ? sideALabel : sideBLabel}?` : 'Potwierdź zwycięzcę'}
                    </DialogTitle></DialogHeader>
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
