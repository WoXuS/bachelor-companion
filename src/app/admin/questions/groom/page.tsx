'use client'

import * as React from 'react'
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query'
import {Button} from '@/components/ui/button'
import {toast} from 'sonner'
import {CustomLoader} from '@/components/ui/CustomLoader'
import AudioPlayer from '@/components/ui/AudioPlayer'
import {PartyPopper, ThumbsDown} from "lucide-react";

type NextQ = {
    question: { id: string; number: number; text: string; audioUrl?: string | null } | null
    progress: { total: number; answered: number; nextIndex: number; done: boolean }
}
type Stats = {
    total: number;
    answered: number;
    correct: number;
    incorrect: number;
    pointsEarned: number;
    shots: number
}

async function fetchNext(): Promise<NextQ> {
    const r = await fetch('/api/quiz/next?kind=GROOM', {cache: 'no-store'})
    const d = await r.json()
    if (!r.ok) throw new Error(d?.message || 'Load failed')
    return d
}

async function fetchStats(): Promise<Stats> {
    const r = await fetch('/api/quiz/groom/stats', {cache: 'no-store'})
    const d = await r.json()
    if (!r.ok) throw new Error(d?.message || 'Stats failed')
    return d
}

async function mark(id: string, correct: boolean) {
    const r = await fetch(`/api/quiz/groom/${id}/mark`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({correct}),
    })
    const d = await r.json().catch(() => ({}))
    if (!r.ok) throw new Error(d?.message || 'Mark failed')
    return d
}

async function undoGroom() {
    const r = await fetch('/api/quiz/groom/undo', {method: 'POST'})
    const d = await r.json().catch(() => ({}))
    if (!r.ok) throw new Error(d?.message || 'Undo failed')
    return d as { undoneQuestionNumber: number }
}

export default function GroomQuizPage() {
    const qc = useQueryClient()

    const nextQ = useQuery({queryKey: ['quiz-next-groom'], queryFn: fetchNext})
    const statsQ = useQuery({queryKey: ['quiz-groom-stats'], queryFn: fetchStats})

    const mut = useMutation({
        mutationFn: ({id, correct}: { id: string; correct: boolean }) => mark(id, correct),
        onSuccess: (_data, vars) => {
            qc.invalidateQueries({queryKey: ['quiz-next-groom']})
            qc.invalidateQueries({queryKey: ['quiz-groom-stats']})
            toast.success(vars.correct ? 'Dobrze! +20 $pruch' : 'Źle. Pij szota.')
        },
        onError: (e: any) => toast.error(e?.message),
    })

    const undoMut = useMutation({
        mutationFn: undoGroom,
        onSuccess: (res) => {
            toast.success(`Cofnięto pytanie #${res.undoneQuestionNumber}`)
            qc.invalidateQueries({queryKey: ['quiz-next-groom']})
            qc.invalidateQueries({queryKey: ['quiz-groom-stats']})
            qc.invalidateQueries({queryKey: ['participants']})
            qc.invalidateQueries({queryKey: ['transactions']})
        },
        onError: (e: any) => toast.error(e?.message),
    })

    if (nextQ.isLoading || statsQ.isLoading) return <CustomLoader/>

    const q = nextQ.data?.question
    const pr = nextQ.data?.progress
    const st = statsQ.data

    const correctPct =
        st && st.answered > 0 ? Math.round((st.correct / st.answered) * 100) : 0

    return (
        <div className="mx-auto max-w-xl space-y-4 p-6 pt-20">
            <header className="space-y-2">
                <h1 className="text-2xl font-bold">Test wiedzy o Ninie</h1>
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

            {st && (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <div className="rounded-lg border bg-emerald-500/10 p-3">
                        <p className="text-xs text-emerald-300">Poprawne</p>
                        <p className="text-lg font-semibold text-emerald-200">
                            {st.correct} <span className="text-xs">({correctPct}%)</span>
                        </p>
                    </div>
                    <div className="rounded-lg border bg-rose-500/10 p-3">
                        <p className="text-xs text-rose-300">Niepoprawne</p>
                        <p className="text-lg font-semibold text-rose-200">{st.incorrect}</p>
                    </div>
                    <div className="rounded-lg border bg-primary/10 p-3">
                        <p className="text-xs text-primary">Zdobyte punkty</p>
                        <p className="text-lg font-semibold text-primary">+{st.pointsEarned} <span
                            className="text-sm">$pruch</span></p>
                    </div>
                    <div className="rounded-lg border bg-amber-500/10 p-3">
                        <p className="text-xs text-amber-300">Wypite szoty</p>
                        <p className="text-lg font-semibold text-amber-200">{st.shots}</p>
                    </div>
                </div>
            )}

            {!q ? (
                <div className="space-y-3 rounded-lg border bg-white/5 p-4">
                    <p className={`font-medium ${correctPct > 60 ? 'text-primary' : 'text-amber-500'}`}>Koniec
                        pytań. {correctPct > 60 ? 'Brawo! Wiecej niż połowa.' : 'Trochę słabo poszło.'}</p>
                    {correctPct > 60 ? <PartyPopper size={50} color="#00BC7DFF" className="mx-auto"/> : <ThumbsDown size={50} color="#FF6467FF" className="mx-auto"/>}

                </div>
            ) : (
                <div className="space-y-4 rounded-lg border bg-white/5 p-4">
                    <p className="font-semibold">
                        <span className="text-sm text-gray-500">#{q.number}.</span> {q.text}
                    </p>
                    {q.audioUrl && <AudioPlayer src={q.audioUrl}/>}

                    <div className="flex gap-2">
                        <Button
                            className="flex-1"
                            onClick={() => mut.mutate({id: q.id, correct: true})}
                            disabled={mut.isPending}
                        >
                            Dobrze
                        </Button>
                        <Button
                            variant="secondary"
                            className="flex-1"
                            onClick={() => mut.mutate({id: q.id, correct: false})}
                            disabled={mut.isPending}
                        >
                            Źle
                        </Button>
                    </div>
                </div>
            )}
        </div>
    )
}
