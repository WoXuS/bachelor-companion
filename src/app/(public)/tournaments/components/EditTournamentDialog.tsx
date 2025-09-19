'use client'
import * as React from 'react'
import {useQuery, useMutation, useQueryClient} from '@tanstack/react-query'
import {Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger} from '@/components/ui/dialog'
import {Button} from '@/components/ui/button'
import {Input} from '@/components/ui/input'
import {Label} from '@/components/ui/label'
import {MultiSelect} from '@/components/ui/multi-select'
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select'
import {toast} from 'sonner'
import {TTournament, TournamentType} from '@/types/tournament'
import {ParticipantDto} from '@/types/participant'
import {Cog} from "lucide-react";

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
        return t.matches.some(m => !!(m.winnerParticipantId || m.winnerTeamId || m.scoreA != null || m.scoreB != null))
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
            const payload: any = {title, mainPrize}
            if (!started) {
                payload.matchWinPrize = matchWinPrize
                payload.consolationPrize = consolationPrize
            }
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
        onError: (e: any) => toast.error(e.message),
    })

    const saveParticipantsMut = useMutation({
        mutationFn: async () => {
            if (!t) throw new Error('Brak turnieju')
            if (started) throw new Error('Turniej już wystartował')

            let body: any
            if (t.type === TournamentType.SOLO) body = {participantIds}
            else body = {teamA, teamB}

            const r = await fetch(`/api/tournaments/${tournamentId}/participants`, {
                method: 'PUT', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(body),
            })
            const j = await r.json().catch(() => ({}))
            if (!r.ok) throw new Error(j?.message || 'Save failed')
            return j
        },
        onSuccess: () => {
            toast.success('Zapisano uczestników');
            qc.invalidateQueries()
        },
        onError: (e: any) => toast.error(e.message),
    })

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button variant="secondary" size="sm"><Cog/></Button></DialogTrigger>
            <DialogContent className="max-w-3xl">
                <DialogHeader><DialogTitle>Edycja turnieju</DialogTitle></DialogHeader>
                {isLoading || !t ? <div className="py-10 text-center text-sm text-gray-400">Ładowanie…</div> : (
                    <div className="flex flex-col gap-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                                <Label>Tytuł</Label>
                                <Input value={title} onChange={(e) => setTitle(e.target.value)}/>
                            </div>
                            <div>
                                <Label>Nagroda główna</Label>
                                <Input type="number" value={Number.isNaN(mainPrize) ? '' : mainPrize}
                                       onChange={(e) => setMainPrize(Number(e.target.value))} inputMode="numeric"/>
                            </div>
                            <div>
                                <Label>Nagroda za mecz</Label>
                                <Input type="number" value={Number.isNaN(matchWinPrize) ? '' : matchWinPrize}
                                       onChange={(e) => setMatchWinPrize(Number(e.target.value))}
                                       inputMode="numeric" disabled={started}/>
                            </div>
                            <div>
                                <Label>Nagroda drabinki przegranych</Label>
                                <Input type="number" value={Number.isNaN(consolationPrize) ? '' : consolationPrize}
                                       onChange={(e) => setConsolationPrize(Number(e.target.value))} inputMode="numeric"
                                       disabled={started}/>
                            </div>
                        </div>

                        <div className="flex justify-end gap-2">
                            <Button onClick={() => saveBasicsMut.mutate()} disabled={saveBasicsMut.isPending}>Zapisz
                                podstawy</Button>
                        </div>

                        {t.type === TournamentType.SOLO ? (
                            <div className="space-y-2">
                                <Label>Uczestnicy (tylko przed startem)</Label>
                                <MultiSelect options={opts} value={participantIds} onValueChange={setParticipantIds}
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
                                        <MultiSelect options={optionsForTeamA} value={teamA.memberIds}
                                                     onValueChange={(vals) => setTeamA({
                                                         ...teamA,
                                                         memberIds: dedupe(vals.filter(id => !teamB.memberIds.includes(id)))
                                                     })}
                                                     className="bg-input/30 hover:bg-input/50"/>
                                    </div>
                                    <div>
                                        <Label>Skład B</Label>
                                        <MultiSelect options={optionsForTeamB} value={teamB.memberIds}
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
