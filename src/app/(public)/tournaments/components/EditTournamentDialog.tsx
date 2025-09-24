'use client'
import * as React from 'react'
import {useQuery, useMutation, useQueryClient} from '@tanstack/react-query'
import {Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger} from '@/components/ui/dialog'
import {Button} from '@/components/ui/button'
import {Input} from '@/components/ui/input'
import {Label} from '@/components/ui/label'
import {MultiSelect} from '@/components/ui/multi-select'
import {toast} from 'sonner'
import {TTournament, TournamentType} from '@/types/tournament'
import {ParticipantDto} from '@/types/participant'
import {Cog, Trash2} from "lucide-react";
import { UpdateTournamentBasicsPayload, UpdateTournamentParticipantsPayload} from "@/types/api";
import {errMsg} from "@/lib/error";

async function fetchTournament(id: string): Promise<TTournament> {
    const r = await fetch(`/api/tournaments/${id}`)
    const j = await r.json()
    if (!r.ok) throw new Error(j?.message || 'Load failed')
    return j
}

async function fetchParticipants(): Promise<ParticipantDto[]> {
    const r = await fetch('/api/participants')
    if (!r.ok) throw new Error('Failed to load participants')
    return r.json()
}

export function EditTournamentDialog({tournamentId}: { tournamentId: string }) {
    const [open, setOpen] = React.useState(false)
    const qc = useQueryClient()

    const {data: t, isLoading} = useQuery({
        enabled: open,
        queryKey: ['tournament', tournamentId, 'edit'],
        queryFn: () => fetchTournament(tournamentId)
    })
    const {data: participants = []} = useQuery({enabled: open, queryKey: ['participants'], queryFn: fetchParticipants})

    const started = React.useMemo(() => {
        if (!t) return false
        return t.matches.some(m =>
                !m.isBye && !!(
                    m.winnerParticipantId ||
                    m.winnerTeamId ||
                    m.scoreA != null ||
                    m.scoreB != null
                )
        )
    }, [t])

    const startedLosers = React.useMemo(() => {
        if (!t) return false
        return t.matches.some(m =>
                !m.isPlayIn && m.bracket === 'LOSERS' && !!(
                    m.winnerParticipantId ||
                    m.winnerTeamId ||
                    m.scoreA != null ||
                    m.scoreB != null
                )
        )
    }, [t])

    const [title, setTitle] = React.useState('')
    const [mainPrize, setMainPrize] = React.useState<number>(0)
    const [matchWinPrize, setMatchWinPrize] = React.useState<number>(0)
    const [consolationPrize, setConsolationPrize] = React.useState<number>(0)

    // SOLO
    const [participantIds, setParticipantIds] = React.useState<string[]>([])
    // TEAM
    const [teamA, setTeamA] = React.useState<{ name: string; memberIds: string[] }>({name: '', memberIds: []})
    const [teamB, setTeamB] = React.useState<{ name: string; memberIds: string[] }>({name: '', memberIds: []})

    React.useEffect(() => {
        if (!t) return
        setTitle(t.title)
        setMainPrize(t.mainPrize)
        setMatchWinPrize(t.matchWinPrize)
        setConsolationPrize(t.consolationPrize)
        if (t.type === TournamentType.SOLO) {
            setParticipantIds(t.participants.map(p => p.participantId))
        } else {
            const [A, B] = t.teams
            setTeamA({name: A?.name ?? '', memberIds: (A?.members ?? []).map(m => m.participant.id)})
            setTeamB({name: B?.name ?? '', memberIds: (B?.members ?? []).map(m => m.participant.id)})
        }
    }, [t])
    const opts = participants.map(p => ({value: p.id, label: p.name}))
    const optionsForTeamA = opts.filter(o => !teamB.memberIds.includes(o.value))
    const optionsForTeamB = opts.filter(o => !teamA.memberIds.includes(o.value))
    const dedupe = (xs: string[]) => Array.from(new Set(xs))

    const saveBasicsMut = useMutation({
        mutationFn: async () => {
            const payload: UpdateTournamentBasicsPayload = !started
                ? {title, mainPrize, matchWinPrize, consolationPrize}
                : {title, mainPrize}
            const r = await fetch(`/api/tournaments/${tournamentId}`, {
                method: 'PUT',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(payload)
            })
            const j = await r.json().catch(() => ({}))
            if (!r.ok) throw new Error(j?.message || 'Save failed')
            return j
        },
        onSuccess: () => {
            toast.success('Zapisano podstawy');
            qc.invalidateQueries()
        },
        onError: (e) => toast.error(errMsg(e)),
    })

    const saveParticipantsMut = useMutation<unknown, Error, void>({
        mutationFn: async () => {
            if (!t) throw new Error('Brak turnieju')
            if (started) throw new Error('Turniej już wystartował')

            const body: UpdateTournamentParticipantsPayload =
                t.type === TournamentType.SOLO
                    ? {type: TournamentType.SOLO, participantIds}
                    : {type: TournamentType.TEAM, teamA, teamB}

            const r = await fetch(`/api/tournaments/${tournamentId}/participants`, {
                method: 'PUT',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(body),
            })
            const j = await r.json().catch(() => ({}))
            if (!r.ok) throw new Error(j?.message || 'Save failed')
            return j
        },
        onSuccess: () => {
            toast.success('Zapisano uczestników')
            qc.invalidateQueries()
        },
        onError: (e) => toast.error(errMsg(e)),
    })

    const deleteMut = useMutation({
        mutationFn: async () => {
            const r = await fetch(`/api/tournaments/${tournamentId}`, {method: 'DELETE'})
            const j = await r.json().catch(() => ({}))
            if (!r.ok) throw new Error(j?.message || 'Delete failed')
            return j
        },
        onSuccess: () => {
            toast.success('Usunięto turniej i cofnięto jego transakcje')
            setOpen(false)
            qc.invalidateQueries()
        },
        onError: (e) => toast.error(errMsg(e)),
    })
    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button variant="secondary" size="sm"
                                           className="h-full rounded-none"><Cog/></Button></DialogTrigger>
            <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
                <DialogHeader><DialogTitle>Edycja turnieju</DialogTitle></DialogHeader>
                {isLoading || !t ? <div className="py-10 text-center text-sm text-gray-400">Ładowanie…</div> : (
                    <div className="flex flex-col gap-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <Label>Tytuł</Label>
                            <Input value={title} onChange={(e) => setTitle(e.target.value)}/>

                            <Label>Nagroda główna</Label>
                            <Input type="number" value={Number.isNaN(mainPrize) ? '' : mainPrize}
                                   onChange={(e) => setMainPrize(Number(e.target.value))} inputMode="numeric"/>

                            <Label>Nagroda za mecz</Label>
                            <Input type="number" value={Number.isNaN(matchWinPrize) ? '' : matchWinPrize}
                                   onChange={(e) => setMatchWinPrize(Number(e.target.value))}
                                   inputMode="numeric" disabled={started}/>

                            <Label>Nagroda drabinki przegranych</Label>
                            <Input type="number" value={Number.isNaN(consolationPrize) ? '' : consolationPrize}
                                   onChange={(e) => setConsolationPrize(Number(e.target.value))} inputMode="numeric"
                                   disabled={startedLosers}/>
                        </div>

                        <div className="flex justify-end gap-2">
                            <Button className="flex-2" onClick={() => saveBasicsMut.mutate()}
                                    disabled={saveBasicsMut.isPending}>Zapisz
                                podstawy</Button>
                            <Button
                                className="flex-1"
                                variant="destructive"
                                onClick={() => {
                                    if (
                                        confirm(
                                            'Na pewno? To cofnie wszystkie wypłaty powiązane z tym turniejem (o ile nikt nie spadnie poniżej 0) i usunie turniej.'
                                        )
                                    ) {
                                        deleteMut.mutate()
                                    }
                                }}
                                disabled={deleteMut.isPending}
                            >
                                <Trash2 size={24}/>
                            </Button>
                        </div>

                        {t.type === TournamentType.SOLO ? (
                            <div className="space-y-2">
                                <Label>Uczestnicy (tylko przed startem)</Label>
                                <MultiSelect options={opts} defaultValue={participantIds}
                                             onValueChange={setParticipantIds} disabled={started}
                                             placeholder="Wybierz uczestników"
                                             className="bg-input/30 hover:bg-input/50"/>
                                <div className="flex justify-end"><Button onClick={() => saveParticipantsMut.mutate()}
                                                                          disabled={started || saveParticipantsMut.isPending}>Zapisz
                                    uczestników</Button></div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div>
                                        <Label>Drużyna A — nazwa</Label>
                                        <Input value={teamA.name}
                                               onChange={(e) => setTeamA({...teamA, name: e.target.value})}
                                               disabled={started}/>
                                    </div>
                                    <div>
                                        <Label>Drużyna B — nazwa</Label>
                                        <Input value={teamB.name}
                                               onChange={(e) => setTeamB({...teamB, name: e.target.value})}
                                               disabled={started}/>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div>
                                        <Label>Skład A</Label>
                                        <MultiSelect options={optionsForTeamA} defaultValue={teamA.memberIds}
                                                     onValueChange={(vals) => setTeamA({
                                                         ...teamA,
                                                         memberIds: dedupe(vals.filter(id => !teamB.memberIds.includes(id)))
                                                     })}
                                                     className="bg-input/30 hover:bg-input/50"/>
                                    </div>
                                    <div>
                                        <Label>Skład B</Label>
                                        <MultiSelect options={optionsForTeamB} defaultValue={teamB.memberIds}
                                                     onValueChange={(vals) => setTeamB({
                                                         ...teamB,
                                                         memberIds: dedupe(vals.filter(id => !teamA.memberIds.includes(id)))
                                                     })}
                                                     className="bg-input/30 hover:bg-input/50"/>
                                    </div>
                                </div>
                                <div className="flex justify-end"><Button onClick={() => saveParticipantsMut.mutate()}
                                                                          disabled={started || saveParticipantsMut.isPending}>Zapisz
                                    składy</Button></div>
                            </div>
                        )}
                    </div>
                )}
            </DialogContent>
        </Dialog>
    )
}
