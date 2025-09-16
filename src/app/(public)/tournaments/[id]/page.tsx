'use client'

import {useParams, useRouter} from 'next/navigation'
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query'
import {Button} from '@/components/ui/button'
import {toast} from 'sonner'
import {getAdmin} from '@/hooks/useAdmin'
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select'
import * as React from 'react'
import {DragDropContext, Droppable, Draggable, DropResult} from '@hello-pangea/dnd'
import {CustomLoader} from "@/components/ui/CustomLoader";

type TParticipant = { id: string; name: string }
type TTeam = { id: string; name: string; members?: { participant: TParticipant }[] }
type TTP = { participantId: string; participant: TParticipant }
type TMatch = {
    id: string
    round: number
    indexInRound: number
    participantAId?: string | null
    participantBId?: string | null
    winnerParticipantId?: string | null
    teamAId?: string | null
    teamBId?: string | null
    winnerTeamId?: string | null
    scoreA?: number | null
    scoreB?: number | null
    isBye?: boolean
}
type TTournament = {
    id: string
    title: string
    type: 'SOLO' | 'TEAM'
    mainPrize: number
    matchWinPrize: number
    participants: TTP[]
    teams: TTeam[]
    matches: TMatch[]
}

async function fetchTournament(id: string): Promise<TTournament> {
    const res = await fetch(`/api/tournaments/${id}`)
    const data = await res.json()
    if (!res.ok) throw new Error(data?.message || 'Load failed')
    return data
}

async function reportMatch(id: string, payload: {
    matchId: string;
    winner: 'A' | 'B';
    scoreA?: number;
    scoreB?: number
}) {
    const res = await fetch(`/api/tournaments/${id}/report`, {
        method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(payload),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data?.message || 'Report failed')
    return data
}

async function savePairs(tournamentId: string, pairs: Array<{
    matchId: string;
    participantAId: string | null;
    participantBId: string | null
}>) {
    const res = await fetch(`/api/tournaments/${tournamentId}/pairs`, {
        method: 'PUT', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({pairs}),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data?.message || 'Save pairs failed')
    return data
}

async function reseedRound1(tournamentId: string) {
    const res = await fetch(`/api/tournaments/${tournamentId}/reseed`, {method: 'POST'})
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data?.message || 'Reseed failed')
    return data
}

export default function TournamentDetailPage() {
    const {id} = useParams() as { id: string }
    const qc = useQueryClient()
    const router = useRouter()
    const {data: me} = useQuery({queryKey: ['me'], queryFn: getAdmin})
    const isAdmin = !!me?.isAdmin

    const {data: t, isLoading} = useQuery({queryKey: ['tournament', id], queryFn: () => fetchTournament(id)})

    const reportMut = useMutation({
        mutationFn: (payload: {
            matchId: string;
            winner: 'A' | 'B';
            scoreA?: number;
            scoreB?: number
        }) => reportMatch(id, payload),
        onSuccess: () => {
            toast.success('Zapisano wynik meczu')
            qc.invalidateQueries({queryKey: ['tournament', id]})
            qc.invalidateQueries({queryKey: ['ranking']})
            qc.invalidateQueries({queryKey: ['participants']})
            qc.invalidateQueries({queryKey: ['transactions']})
        },
        onError: (e: any) => toast.error(e.message),
    })

    if (isLoading || !t) return <CustomLoader/>

    const rounds = groupMatchesByRound(t.matches)

    return (
        <div className="max-w-5xl mx-auto p-6 space-y-6 pt-20">
            <header className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold">{t.title}</h1>
                    <div className="text-sm text-gray-400">
                        Typ: {t.type} — Main: {t.mainPrize} — Za mecz: {t.matchWinPrize}
                    </div>
                </div>
                {isAdmin && t.type === 'SOLO' && (
                    <div className="flex gap-2">
                        <EditPairsDialog
                            tournament={t}
                            onSaved={() => qc.invalidateQueries({queryKey: ['tournament', id]})}
                            onReseed={() => {
                                reseedRound1(id)
                                    .then(() => {
                                        toast.success('Przetasowano pary rundy 1')
                                        qc.invalidateQueries({queryKey: ['tournament', id]})
                                    })
                                    .catch((e) => toast.error(e.message))
                            }}
                        />
                    </div>
                )}
            </header>

            {/* Rounds grid */}
            <div className="overflow-auto">
                <div
                    className="grid gap-6"
                    style={{gridTemplateColumns: `repeat(${rounds.length || 1}, minmax(220px, 1fr))`}}
                >
                    {rounds.map((ms, idx) => (
                        <div key={idx} className="space-y-3">
                            <div className="font-semibold">Runda {ms[0]?.round ?? idx + 1}</div>
                            {ms.map((m) => (
                                <MatchCard
                                    key={m.id}
                                    m={m}
                                    t={t}
                                    canEdit={isAdmin}
                                    onReport={(winner) => reportMut.mutate({matchId: m.id, winner})}
                                />
                            ))}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}

function groupMatchesByRound(matches: TMatch[]) {
    const sorted = [...matches].sort((a, b) =>
        a.round === b.round ? a.indexInRound - b.indexInRound : a.round - b.round
    )
    const rounds: TMatch[][] = []
    let cur = -1
    for (const m of sorted) {
        if (m.round !== cur) {
            rounds.push([])
            cur = m.round
        }
        rounds[rounds.length - 1].push(m)
    }
    return rounds
}

function labelForMatch(m: TMatch, t: TTournament) {
    if (t.type === 'SOLO') {
        const A = t.participants.find((p) => p.participantId === m.participantAId)?.participant?.name ?? '—'
        const B = t.participants.find((p) => p.participantId === m.participantBId)?.participant?.name ?? '—'
        return {A, B}
    } else {
        const A = t.teams.find((x) => x.id === m.teamAId)?.name ?? '—'
        const B = t.teams.find((x) => x.id === m.teamBId)?.name ?? '—'
        return {A, B}
    }
}

function MatchCard({
                       m, t, canEdit, onReport,
                   }: { m: TMatch; t: TTournament; canEdit: boolean; onReport: (w: 'A' | 'B') => void }) {
    const {A, B} = labelForMatch(m, t)
    const decided = !!(m.winnerParticipantId || m.winnerTeamId)
    const isSolo = t.type === 'SOLO'
    return (
        <div className="rounded-lg border bg-white/5 p-3">
            <div className="font-medium">
                {A} vs {B}
            </div>
            {decided ? (
                <div className="text-sm text-green-400 mt-1">Rozstrzygnięty</div>
            ) : canEdit && isSolo ? (
                <div className="flex gap-2 mt-2">
                    <Button size="sm" onClick={() => onReport('A')} disabled={!m.participantAId}>Wygrał: {A}</Button>
                    <Button size="sm" onClick={() => onReport('B')} disabled={!m.participantBId}>Wygrał: {B}</Button>
                </div>
            ) : (
                <div className="text-sm text-gray-400 mt-1">W toku…</div>
            )}
        </div>
    )
}

/** -----------------------------
 *  Edit pairs dialog (Round 1)
 *  Drag & Drop uczestników między slotami A/B
 *  ----------------------------- */
function EditPairsDialog({
                             tournament,
                             onSaved,
                             onReseed,
                         }: {
    tournament: TTournament
    onSaved: () => void
    onReseed: () => void
}) {
    const qc = useQueryClient()
    const [open, setOpen] = React.useState(false)
    const r1 = React.useMemo(
        () => tournament.matches.filter((m) => m.round === 1).sort((a, b) => a.indexInRound - b.indexInRound),
        [tournament.matches]
    )

    // zbuduj sloty: dla każdego meczu 2 sloty (A,B)
    type SlotId = string // `${matchId}::A|B`
    type SlotMap = Record<SlotId, TParticipant | null>

    const initialSlots: SlotMap = {}
    const used = new Set<string>()
    for (const m of r1) {
        const A = tournament.participants.find((p) => p.participantId === m.participantAId)?.participant ?? null
        const B = tournament.participants.find((p) => p.participantId === m.participantBId)?.participant ?? null
        if (A) used.add(A.id)
        if (B) used.add(B.id)
        initialSlots[`${m.id}::A`] = A
        initialSlots[`${m.id}::B`] = B
    }
    // „ławka rezerwowych” – uczestnicy wybrani do turnieju, którzy nie są w żadnym slocie (np. po czyszczeniu)
    const benchInitial = tournament.participants
        .map((tp) => tp.participant)
        .filter((p) => !used.has(p.id))

    const [slots, setSlots] = React.useState<SlotMap>(initialSlots)
    const [bench, setBench] = React.useState<TParticipant[]>(benchInitial)

    React.useEffect(() => {
        if (!open) return
        setSlots(initialSlots)
        setBench(benchInitial)
    }, [open]) // eslint-disable-line

    const onDragEnd = (result: DropResult) => {
        const {source, destination, draggableId} = result
        if (!destination) return
        if (source.droppableId === destination.droppableId &&
            source.index === destination.index) return

        // draggableId = participantId
        const pid = draggableId

        // helper – usuń pid z każdego miejsca
        const removeEverywhere = (s: SlotMap, b: TParticipant[]) => {
            const next: SlotMap = {...s}
            for (const key of Object.keys(next)) {
                if (next[key]?.id === pid) next[key] = null
            }
            const nextBench = b.filter((p) => p.id !== pid)
            return {next, nextBench}
        }

        // źródło/dest mogą być: slotA/B lub „bench”
        const isBenchSrc = source.droppableId === 'bench'
        const isBenchDst = destination.droppableId === 'bench'

        const pObj =
            bench.find((p) => p.id === pid) ||
            Object.values(slots).find((p) => p?.id === pid) ||
            null
        if (!pObj) return

        const {next, nextBench} = removeEverywhere(slots, bench)

        if (isBenchDst) {
            // przeniesiono na ławkę
            setSlots(next)
            setBench([...nextBench, pObj])
            return
        }

        // przeniesiono do slotu
        const dstKey = destination.droppableId as SlotId
        next[dstKey] = pObj
        setSlots(next)
        setBench(nextBench)
    }

    const savePairsMut = useMutation({
        mutationFn: (pairs: Array<{ matchId: string; participantAId: string | null; participantBId: string | null }>) =>
            savePairs(tournament.id, pairs),
        onSuccess: () => {
            toast.success('Zapisano pary rundy 1')
            setOpen(false)
            onSaved()
        },
        onError: (e: any) => toast.error(e.message),
    })

    const handleSave = () => {
        const pairs = r1.map((m) => ({
            matchId: m.id,
            participantAId: slots[`${m.id}::A`]?.id ?? null,
            participantBId: slots[`${m.id}::B`]?.id ?? null,
        }))
        // walidacja: uczestnik nie może wystąpić >1
        const seen = new Set<string>()
        for (const p of Object.values(slots)) {
            if (!p) continue
            const key = p.id
            if (seen.has(key)) {
                toast.error('Ten sam uczestnik przypisany do wielu slotów')
                return
            }
            seen.add(key)
        }
        savePairsMut.mutate(pairs)
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="secondary">Edycja par (Runda 1)</Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl">
                <DialogHeader>
                    <DialogTitle>Edycja par — przeciągnij uczestników w sloty</DialogTitle>
                </DialogHeader>

                <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-2">
                        <Button variant="outline" onClick={onReseed}>Reseed</Button>
                        <div className="text-sm text-gray-400">Reseed losuje pary w rundzie 1</div>
                    </div>

                    <DragDropContext onDragEnd={onDragEnd}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Ławka */}
                            <Droppable droppableId="bench" direction="vertical">
                                {(provided) => (
                                    <div
                                        ref={provided.innerRef}
                                        {...provided.droppableProps}
                                        className="rounded-xl border bg-white/5 p-3 min-h-[120px]"
                                    >
                                        <div className="font-semibold mb-2">Ławka (nieprzypisani)</div>
                                        <div className="flex flex-col gap-2">
                                            {bench.map((p, idx) => (
                                                <Draggable key={p.id} draggableId={p.id} index={idx}>
                                                    {(pdrag) => (
                                                        <div
                                                            ref={pdrag.innerRef}
                                                            {...pdrag.draggableProps}
                                                            {...pdrag.dragHandleProps}
                                                            className="rounded-md border bg-white/10 px-3 py-2"
                                                        >
                                                            {p.name}
                                                        </div>
                                                    )}
                                                </Draggable>
                                            ))}
                                            {provided.placeholder}
                                        </div>
                                    </div>
                                )}
                            </Droppable>

                            {/* Sloty: po dwa na mecz */}
                            <div className="space-y-4">
                                {r1.map((m, i) => (
                                    <div key={m.id} className="rounded-xl border bg-white/5 p-3">
                                        <div className="font-semibold mb-2">Mecz #{i + 1}</div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <Slot droppableId={`${m.id}::A`} participant={slots[`${m.id}::A`]}/>
                                            <Slot droppableId={`${m.id}::B`} participant={slots[`${m.id}::B`]}/>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </DragDropContext>

                    <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setOpen(false)}>Anuluj</Button>
                        <Button onClick={handleSave} disabled={savePairsMut.isPending}>Zapisz</Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}

function Slot({droppableId, participant}: { droppableId: string; participant: TParticipant | null }) {
    return (
        <Droppable droppableId={droppableId} direction="vertical">
            {(provided, snapshot) => (
                <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`rounded-md border min-h-[56px] p-2 ${snapshot.isDraggingOver ? 'bg-white/10' : 'bg-transparent'}`}
                >
                    {participant ? (
                        <Draggable draggableId={participant.id} index={0}>
                            {(pdrag) => (
                                <div
                                    ref={pdrag.innerRef}
                                    {...pdrag.draggableProps}
                                    {...pdrag.dragHandleProps}
                                    className="rounded-md border bg-white/10 px-3 py-2"
                                >
                                    {participant.name}
                                </div>
                            )}
                        </Draggable>
                    ) : (
                        <div className="text-sm text-gray-500">Przeciągnij tutaj</div>
                    )}
                    {provided.placeholder}
                </div>
            )}
        </Droppable>
    )
}
