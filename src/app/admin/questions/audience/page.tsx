'use client'

import * as React from 'react'
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query'
import {Button} from '@/components/ui/button'
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select'
import {toast} from 'sonner'
import {CustomLoader} from '@/components/ui/CustomLoader'
import {ParticipantDto} from '@/types/participant'
import AudioPlayer from '@/components/ui/AudioPlayer'
import {CheckCheck} from "lucide-react";
import {errMsg} from "@/lib/error";

type NextQ = {
    question: { id: string; number: number; text: string; audioUrl?: string | null } | null
    progress: { total: number; answered: number; nextIndex: number; done: boolean }
}
type Standings = {
    standings: { id: string; name: string; correct: number }[]
    maxCorrect: number
    bonusGranted: boolean
    winners: string[]
}

async function fetchNext(): Promise<NextQ> {
    const r = await fetch('/api/quiz/next?kind=AUDIENCE', {cache: 'no-store'})
    const d = await r.json()
    if (!r.ok) throw new Error(d?.message || 'Load failed')
    return d
}

async function fetchParticipants(): Promise<ParticipantDto[]> {
    const r = await fetch('/api/participants', {cache: 'no-store'})
    if (!r.ok) throw new Error('Load participants failed')
    return r.json()
}

async function fetchConfig(): Promise<{ audienceExcludeIds?: string[] }> {
    const r = await fetch('/api/shop/config', {cache: 'no-store'})
    const d = await r.json()
    if (!r.ok) throw new Error(d?.message || 'Load config failed')
    return {audienceExcludeIds: Array.isArray(d.audienceExcludeIds) ? d.audienceExcludeIds : []}
}

async function award(id: string, participantId: string) {
    const r = await fetch(`/api/quiz/audience/${id}/award`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({participantId}),
    })
    const d = await r.json().catch(() => ({}))
    if (!r.ok) throw new Error(d?.message || 'Award failed')
    return d
}

async function finalize() {
    const r = await fetch(`/api/quiz/audience/finalize`, {method: 'POST'})
    const d = await r.json().catch(() => ({}))
    if (!r.ok) throw new Error(d?.message || 'Finalize failed')
    return d as { winners: { participantId: string; name: string; correct: number }[]; maxCorrect: number }
}

async function undoAudience() {
    const r = await fetch('/api/quiz/audience/undo', {method: 'POST'})
    const d = await r.json().catch(() => ({}))
    if (!r.ok) throw new Error(d?.message || 'Undo failed')
    return d as { undoneQuestionNumber: number; participantId: string }
}

async function fetchStandings(): Promise<Standings> {
    const r = await fetch('/api/quiz/audience/standings', {cache: 'no-store'})
    const d = await r.json()
    if (!r.ok) throw new Error(d?.message || 'Standings failed')
    return d
}

export default function AudienceQuizPage() {
    const qc = useQueryClient()
    const nextQ = useQuery({queryKey: ['quiz-next-aud'], queryFn: fetchNext})
    const peopleQ = useQuery({queryKey: ['participants'], queryFn: fetchParticipants})
    const cfgQ = useQuery({queryKey: ['shop-config'], queryFn: fetchConfig})
    const standingsQ = useQuery({queryKey: ['aud-standings'], queryFn: fetchStandings, enabled: !nextQ.data?.question})

    const exclude = React.useMemo(
        () => new Set((cfgQ.data?.audienceExcludeIds ?? []).filter(Boolean)),
        [cfgQ.data?.audienceExcludeIds]
    )
    const candidates = (peopleQ.data ?? []).filter(p => !exclude.has(p.id))

    const [selected, setSelected] = React.useState<string>('')

    const awardMut = useMutation({
        mutationFn: ({id, pid}: { id: string; pid: string }) => award(id, pid),
        onSuccess: async () => {
            toast.success('Przyznano +40 $pruch')
            await qc.invalidateQueries({queryKey: ['quiz-next-aud']})
            await qc.invalidateQueries({queryKey: ['aud-standings']})
            setSelected('')
        },
        onError: (e) => toast.error(errMsg(e)),
    })

    const finalizeMut = useMutation({
        mutationFn: finalize,
        onSuccess: (res) => {
            if (res.winners.length === 0) {
                toast.info('Brak zwycięzcy bonusu')
            } else {
                const names = res.winners.map(w => `${w.name} (${w.correct})`).join(', ')
                toast.success(`Bonus +50: ${names}`)
            }
            qc.invalidateQueries({queryKey: ['participants']})
            qc.invalidateQueries({queryKey: ['transactions']})
            qc.invalidateQueries({queryKey: ['aud-standings']})
        },
        onError: (e) => toast.error(errMsg(e)),
    })

    const undoMut = useMutation({
        mutationFn: undoAudience,
        onSuccess: (res) => {
            toast.success(`Cofnięto pytanie #${res.undoneQuestionNumber}`)
            qc.invalidateQueries({queryKey: ['quiz-next-aud']})
            qc.invalidateQueries({queryKey: ['participants']})
            qc.invalidateQueries({queryKey: ['transactions']})
            qc.invalidateQueries({queryKey: ['aud-standings']})
        },
        onError: (e) => toast.error(errMsg(e)),
    })

    if (nextQ.isLoading || peopleQ.isLoading || cfgQ.isLoading) return <CustomLoader/>
    const q = nextQ.data?.question
    const pr = nextQ.data?.progress

    const onAward = async () => {
        if (!q || !selected) return
        await awardMut.mutateAsync({id: q.id, pid: selected})
        const next = await fetchNext()
        qc.setQueryData(['quiz-next-aud'], next)
        if (!next.question && !finalizeMut.isPending) {
            finalizeMut.mutate()
        }
    }

    return (
        <div className="mx-auto max-w-xl space-y-4 p-6 pt-20">
            <header className="flex flex-col gap-2">
                <h1 className="text-2xl font-bold">Test wiedzy o Antonim</h1>
                {pr && (
                    <div className="flex justify-between gap-2">
                        <p className="text-sm text-muted-foreground">
                            Pytanie {Math.min(pr.nextIndex, pr.total)} / {pr.total}
                        </p>
                        {pr.nextIndex > 1 &&
                            <Button variant="secondary" size="sm" onClick={() => undoMut.mutate()}
                                    disabled={undoMut.isPending}>
                                Cofnij odpowiedź
                            </Button>}
                    </div>
                )}


            </header>

            {
                !q ? (
                    <div className="space-y-4 rounded-lg border bg-white/5 p-4">
                        {standingsQ.data ? (
                            <div>
                                <h2 className="mb-2 text-lg font-semibold">Ranking poprawnych odpowiedzi</h2>
                                <ul className="divide-y divide-white/10 rounded-lg border bg-white/5">
                                    {standingsQ.data.standings.map((row, idx) => {
                                        const place = idx + 1
                                        const isWinner = standingsQ.data.winners.includes(row.id)
                                        const tone =
                                            place === 1 ? 'bg-amber-500/10 text-amber-200 border-amber-500/30'
                                                : place === 2 ? 'bg-slate-500/10 text-slate-200 border-slate-500/30'
                                                    : place === 3 ? 'bg-orange-500/10 text-orange-200 border-orange-500/30'
                                                        : 'text-slate-200'
                                        return (
                                            <li key={row.id} className="flex items-center justify-between p-3">
                                                <div className="flex items-center gap-3">
                        <span
                            className={`inline-flex h-6 w-6 items-center justify-center rounded-md border text-xs ${tone}`}>
                          {place}
                        </span>
                                                    <span className="font-medium">{row.name}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {isWinner && standingsQ.data.bonusGranted && (
                                                        <span
                                                            className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 text-[9px] font-semibold text-emerald-300">
                            bonus +50
                          </span>
                                                    )}
                                                    <span className="text-xs flex gap-1"><CheckCheck size={16}/> <b>{row.correct}</b></span>

                                                </div>
                                            </li>
                                        )
                                    })}
                                </ul>
                                {standingsQ.data.bonusGranted ? (
                                    <p className="mt-2 text-xs text-emerald-300">
                                        Bonus +50 przyznany dla miejsca 1 (remisy: wszyscy na 1. miejscu).
                                    </p>
                                ) : (
                                    <p className="mt-2 text-xs text-muted-foreground">
                                        Bonus jeszcze nie przyznany.
                                    </p>
                                )}
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground">Ładowanie rankingu…</p>
                        )}
                    </div>
                ) : (
                    <div className="space-y-6 rounded-lg border bg-white/5 p-4">
                        <p className="font-semibold">
                            <span className="text-sm text-gray-500">#{q.number}.</span> {q.text}
                        </p>
                        {q.audioUrl && <AudioPlayer src={q.audioUrl}/>}

                        <div className="flex flex-col gap-2">
                            <p className="text-sm">Kto odpowiedział?</p>
                            <div className="flex items-center gap-2">
                                <Select value={selected || undefined} onValueChange={setSelected}>
                                    <SelectTrigger><SelectValue
                                        placeholder="Kto"/></SelectTrigger>
                                    <SelectContent>
                                        {candidates.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                                <Button onClick={onAward} disabled={!selected || awardMut.isPending}>Przyznaj
                                    punkty</Button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div>
    )
}
