'use client'

import * as React from 'react'
import {useQuery, useMutation, useQueryClient} from '@tanstack/react-query'
import {Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger} from '@/components/ui/dialog'
import {Button} from '@/components/ui/button'
import {Input} from '@/components/ui/input'
import {Label} from '@/components/ui/label'
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select'
import {toast} from 'sonner'
import {Cog, Trash2} from 'lucide-react'
import {DuelDto} from '@/types/duel'
import {errMsg} from "@/lib/errors";
import {fetchParticipants} from '@/hooks/queries'
import {apiGet} from '@/lib/api-client'

export type CreateDuelInput = Pick<DuelDto, 'title' | 'stake' | 'playerAId' | 'playerBId' | 'bestOf'>

const fetchDuel = (id: string) => apiGet<DuelDto>(`/api/duels/${id}`)


type BestOf = 1 | 3 | 5

export function EditDuelDialog({duelId}: { duelId: string }) {
    const [open, setOpen] = React.useState(false)
    const qc = useQueryClient()

    const {data: duel, isLoading} = useQuery({
        enabled: open,
        queryKey: ['duel', duelId, 'edit'],
        queryFn: () => fetchDuel(duelId),
    })
    const {data: participants = []} = useQuery({
        enabled: open,
        queryKey: ['participants'],
        queryFn: fetchParticipants,
    })

    const started = React.useMemo(() => {
        if (!duel) return false
        return !!(duel.winnerId || duel.scoreA != null || duel.scoreB != null)
    }, [duel])

    const [title, setTitle] = React.useState('')
    const [stake, setStake] = React.useState<number>(0)
    const [playerAId, setPlayerAId] = React.useState<string>('')
    const [playerBId, setPlayerBId] = React.useState<string>('')
    const [bestOf, setBestOf] = React.useState<BestOf>(1)

    React.useEffect(() => {
        if (!duel) return
        setTitle(duel.title ?? '')
        setStake(duel.stake ?? 0)
        setPlayerAId(duel.playerAId ?? '')
        setPlayerBId(duel.playerBId ?? '')
        setBestOf((duel.bestOf as BestOf) ?? 1)
    }, [duel])

    const participantOptions = participants.map((p) => ({value: p.id, label: p.name}))
    const optionsForA = participantOptions.filter((o) => o.value !== playerBId)
    const optionsForB = participantOptions.filter((o) => o.value !== playerAId)

    const saveBasicsMut = useMutation({
        mutationFn: async () => {
            if (!title.trim()) throw new Error('Podaj tytuł')
            if (!Number.isFinite(stake) || stake < 0) throw new Error('Nieprawidłowa stawka')
            if (!started) {
                if (!playerAId || !playerBId) throw new Error('Wybierz obu graczy')
                if (playerAId === playerBId) throw new Error('Gracze muszą być różni')
            }

            const payload: CreateDuelInput = {title, stake, playerAId, playerBId, bestOf}
            const r = await fetch(`/api/duels/${duelId}`, {
                method: 'PUT',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(payload),
            })
            const j = await r.json().catch(() => ({}))
            if (!r.ok) throw new Error(j?.message || 'Save failed')
            return j
        },
        onSuccess: () => {
            toast.success('Zapisano pojedynek')
            qc.invalidateQueries()
        },
        onError: (e) => toast.error(errMsg(e)),
    })

    const saveBestOfMut = useMutation({
        mutationFn: async (bo: BestOf) => {
            const r = await fetch(`/api/duels/${duelId}`, {
                method: 'PATCH',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({bestOf: bo}),
            })
            const j = await r.json().catch(() => ({}))
            if (!r.ok) throw new Error(j?.message || 'BO update failed')
            return j
        },
        onSuccess: () => {
            toast.success('Zmieniono BO')
            qc.invalidateQueries()
        },
        onError: (e) => toast.error(errMsg(e)),
    })

    const deleteMut = useMutation({
        mutationFn: async () => {
            const r = await fetch(`/api/duels/${duelId}`, {method: 'DELETE'})
            const j = await r.json().catch(() => ({}))
            if (!r.ok) throw new Error(j?.message || 'Delete failed')
            return j
        },
        onSuccess: () => {
            toast.success('Usunięto pojedynek')
            setOpen(false)
            qc.invalidateQueries()
        },
        onError: (e) => toast.error(errMsg(e)),
    })

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="secondary" size="sm" className="h-full rounded-none">
                    <Cog/>
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Edycja pojedynku</DialogTitle>
                </DialogHeader>

                {isLoading || !duel ? (
                    <div className="py-10 text-center text-sm text-gray-400">Ładowanie…</div>
                ) : (
                    <div className="flex flex-col gap-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <Label>Tytuł</Label>
                            <Input value={title} onChange={(e) => setTitle(e.target.value)}/>

                            <Label>Stawka</Label>
                            <Input
                                type="number"
                                value={Number.isNaN(stake) ? '' : stake}
                                onChange={(e) => setStake(Number(e.target.value))}
                                inputMode="numeric"
                            />

                            <Label>Gracz A {started &&
                                <span className="text-xs text-gray-400">(zablokowane po starcie)</span>}</Label>
                            <Select
                                disabled={started}
                                value={playerAId || ''}
                                onValueChange={(v) => setPlayerAId(v)}
                            >
                                <SelectTrigger><SelectValue placeholder="Wybierz gracza A"/></SelectTrigger>
                                <SelectContent>
                                    {optionsForA.map((o) => (
                                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <Label>Gracz B {started &&
                                <span className="text-xs text-gray-400">(zablokowane po starcie)</span>}</Label>
                            <Select
                                disabled={started}
                                value={playerBId || ''}
                                onValueChange={(v) => setPlayerBId(v)}
                            >
                                <SelectTrigger><SelectValue placeholder="Wybierz gracza B"/></SelectTrigger>
                                <SelectContent>
                                    {optionsForB.map((o) => (
                                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <Label>BEST OF</Label>
                            <Select
                                value={String(bestOf)}
                                onValueChange={(v) => {
                                    const bo = Number(v) as BestOf
                                    setBestOf(bo)
                                    // zmieniamy od razu; zablokowane, jeśli pojedynek już rozstrzygnięty
                                    if (!duel.winnerId) saveBestOfMut.mutate(bo)
                                    else toast.error('Nie można zmienić BO po zakończeniu pojedynku')
                                }}
                                disabled={!!duel.winnerId}
                            >
                                <SelectTrigger><SelectValue/></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="1">1</SelectItem>
                                    <SelectItem value="3">3</SelectItem>
                                    <SelectItem value="5">5</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex justify-end gap-2">
                            <Button
                                className="flex-2"
                                onClick={() => saveBasicsMut.mutate()}
                                disabled={saveBasicsMut.isPending}
                            >
                                Zapisz
                            </Button>
                            <Button
                                className="flex-1"
                                variant="destructive"
                                onClick={() => {
                                    if (confirm('Na pewno usunąć pojedynek? Cofnie to powiązane transakcje i saldo.')) {
                                        deleteMut.mutate()
                                    }
                                }}
                                disabled={deleteMut.isPending}
                            >
                                <Trash2 size={24}/>
                            </Button>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    )
}
