import * as React from "react";
import {createPortal} from "react-dom";
import {DragDropContext, Draggable, Droppable, DropResult} from "@hello-pangea/dnd";
import {useMutation, useQueryClient} from "@tanstack/react-query";
import {toast} from "sonner";
import {Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger} from "@/components/ui/dialog";
import {Button} from "@/components/ui/button";
import {TParticipant, TTournament} from "@/types/tournament";
import {winnersOnly} from "@/app/(public)/tournaments/[id]/utils/bracketMeta";

function DraggableInPortal({provided, snapshot, children}: {
    provided: any, snapshot?: any, children: React.ReactNode
}) {
    const child = (
        <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            style={provided.draggableProps.style}
            className="w-full"
        >
            {children}
        </div>
    )
    return snapshot.isDragging ? createPortal(child, document.body) : child
}

export default function EditSeedingDialog({
                                              tournament, onSaved, onReseed,
                                          }: { tournament: TTournament; onSaved: () => void; onReseed: () => void }) {
    const [open, setOpen] = React.useState(false)

    const r0 = React.useMemo(
        () => winnersOnly(tournament.matches)
            .filter(m => m.round === 1)
            .sort((a, b) => a.indexInRound - b.indexInRound)
            .filter(m => !m.isBye),
        [tournament.matches]
    )

    const r0Locked = React.useMemo(
        () => r0.some(m => !!m.winnerParticipantId || m.scoreA != null || m.scoreB != null),
        [r0]
    )

    type SlotId = string
    type SlotMap = Record<SlotId, TParticipant | null>

    const initialSlots: SlotMap = {}
    const used = new Set<string>()
    for (const m of r0) {
        const A = tournament.participants.find(p => p.participantId === m.participantAId)?.participant ?? null
        const B = tournament.participants.find(p => p.participantId === m.participantBId)?.participant ?? null
        if (A) used.add(A.id)
        if (B) used.add(B.id)
        initialSlots[`${m.id}::A`] = A
        initialSlots[`${m.id}::B`] = B
    }
    const allowedPids = new Set<string>()
    for (const m of r0) {
        if (m.participantAId) allowedPids.add(m.participantAId)
        if (m.participantBId) allowedPids.add(m.participantBId)
    }

    const benchInitial = tournament.participants
        .filter(tp => allowedPids.has(tp.participantId))
        .map(tp => tp.participant)
        .filter(p => !used.has(p.id))

    const [slots, setSlots] = React.useState<SlotMap>(initialSlots)
    const [bench, setBench] = React.useState<TParticipant[]>(benchInitial)

    React.useEffect(() => {
        if (!open) return
        setSlots(initialSlots)
        setBench(benchInitial)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open])

    const onDragEnd = (result: DropResult) => {
        const {source, destination, draggableId} = result
        if (!destination) return
        if (source.droppableId === destination.droppableId && source.index === destination.index) return
        if (r0Locked) return

        const pid = draggableId
        const pObj =
            bench.find(p => p.id === pid) ||
            Object.values(slots).find(p => p?.id === pid) ||
            null
        if (!pObj) return

        const next: SlotMap = {...slots}
        for (const key of Object.keys(next)) if (next[key]?.id === pid) next[key] = null
        const nextBench = bench.filter(p => p.id !== pid)

        if (destination.droppableId === 'bench') {
            setSlots(next)
            setBench([...nextBench, pObj])
            return
        }

        const dstKey = destination.droppableId as SlotId
        next[dstKey] = pObj
        setSlots(next)
        setBench(nextBench)
    }

    const qc = useQueryClient()
    const savePairsMut = useMutation({
        mutationFn: (payload: {
            round: number
            pairs: Array<{ matchId: string; participantAId: string | null; participantBId: string | null }>
        }) => fetch(`/api/tournaments/${tournament.id}/pairs`, {
            method: 'PUT',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(payload),
        }).then(async r => {
            const data = await r.json().catch(() => ({}))
            if (!r.ok) throw new Error(data?.message || 'Save pairs failed')
            return data
        }),
        onSuccess: () => {
            toast.success('Zapisano rozstawienie (R0)')
            setOpen(false)
            onSaved()
            qc.invalidateQueries({queryKey: ['tournament', tournament.id]})
        },
        onError: (e: any) => toast.error(e.message),
    })

    const handleSave = () => {
        if (r0Locked) return
        const seen = new Set<string>()
        for (const p of Object.values(slots)) {
            if (!p) continue
            if (seen.has(p.id)) {
                toast.error('Ten sam uczestnik przypisany do wielu slotów')
                return
            }
            seen.add(p.id)
        }
        const pairs = r0.map(m => ({
            matchId: m.id,
            participantAId: slots[`${m.id}::A`]?.id ?? null,
            participantBId: slots[`${m.id}::B`]?.id ?? null,
        }))
        savePairsMut.mutate({round: 1, pairs})
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="secondary">Edycja rozstawienia (Runda 0)</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto [transform:none]">
                <DialogHeader>
                    <DialogTitle>
                        {r0Locked ? 'Runda 0 już rozpoczęta — edycja zablokowana' : 'Edycja rozstawienia (Round 0)'}
                    </DialogTitle>
                </DialogHeader>

                <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-2">
                        <Button variant="outline" onClick={onReseed} disabled={r0Locked}>Reseed</Button>
                        <div className="text-sm text-gray-400">
                            {r0Locked
                                ? 'Nie można zmieniać po rozpoczęciu R0.'
                                : 'Przeciągnij uczestników między slotami. Pusty slot = bye.'}
                        </div>
                    </div>

                    <DragDropContext onDragEnd={onDragEnd}>
                        <div className="flex gap-3 md:flex-row flex-col">
                            <Droppable droppableId="bench" direction="vertical" ignoreContainerClipping>
                                {(provided) => (
                                    <div
                                        ref={provided.innerRef}
                                        {...provided.droppableProps}
                                        className="rounded-xl border bg-white/5 p-3 min-h-[120px] flex-1"
                                    >
                                        <div className="font-semibold mb-2">Ławka (nieprzypisani)</div>
                                        <div className="flex flex-col gap-2">
                                            {bench.map((p, idx) => (
                                                <Draggable key={p.id} draggableId={p.id} index={idx}
                                                           isDragDisabled={r0Locked}>

                                                    {(pdrag, snapshot) => (
                                                        <DraggableInPortal provided={pdrag} snapshot={snapshot}>
                                                            <div
                                                                className="rounded-md border bg-white/10 px-3 py-2">{p.name}</div>
                                                        </DraggableInPortal>
                                                    )}
                                                </Draggable>
                                            ))}
                                            {provided.placeholder}
                                        </div>
                                    </div>
                                )}
                            </Droppable>

                            <div className="space-y-4 flex-2">
                                {r0.map((m, i) => {
                                    const isBye = !m.participantAId || !m.participantBId
                                    return (
                                        <div key={m.id} className="rounded-xl border bg-white/5 p-3">
                                            <div className="font-semibold mb-2 flex items-center gap-2">
                                                Play-in #{i + 1}
                                                {isBye && (
                                                    <span
                                                        className="text-[10px] px-2 py-[2px] rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                            Bye
                          </span>
                                                )}
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <R0Slot droppableId={`${m.id}::A`} participant={slots[`${m.id}::A`]}
                                                        locked={r0Locked}/>
                                                <R0Slot droppableId={`${m.id}::B`} participant={slots[`${m.id}::B`]}
                                                        locked={r0Locked}/>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    </DragDropContext>

                    <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setOpen(false)}>Anuluj</Button>
                        <Button onClick={handleSave} disabled={r0Locked || savePairsMut.isPending}>Zapisz</Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}

function R0Slot({droppableId, participant, locked}: {
    droppableId: string;
    participant: TParticipant | null;
    locked: boolean
}) {
    return (
        <Droppable droppableId={droppableId} direction="vertical">
            {(provided, snapshot) => (
                <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`rounded-md border min-h-[56px] p-2 ${snapshot.isDraggingOver ? 'bg-white/10' : 'bg-transparent'}`}
                >
                    {participant ? (
                        <Draggable draggableId={participant.id} index={0} isDragDisabled={locked}>
                            {(pdrag, snapshot) => (
                                <DraggableInPortal provided={pdrag} snapshot={snapshot}>
                                    <div className="rounded-md border bg-white/10 px-3 py-2">{participant.name}</div>
                                </DraggableInPortal>
                            )}
                        </Draggable>
                    ) : (
                        <div className="text-sm text-gray-500">— bye —</div>
                    )}
                    {provided.placeholder}
                </div>
            )}
        </Droppable>
    )
}

