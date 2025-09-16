'use client'

import {useQuery, useMutation, useQueryClient} from '@tanstack/react-query'
import {Button} from '@/components/ui/button'
import {MultiSelect} from "@/components/ui/multi-select";
import {Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger} from '@/components/ui/dialog'
import {Input} from '@/components/ui/input'
import {Label} from "@/components/ui/label"
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select'
import Link from 'next/link'
import {useMemo, useState} from 'react'
import {toast} from 'sonner'
import {getAdmin} from '@/hooks/useAdmin'
import {
    ApiError,
    CreateTournamentPayload,
    TournamentListItemDto,
    TournamentType,
} from '@/types/tournament'
import {ParticipantDto} from "@/types/participant";

async function fetchTournaments(): Promise<TournamentListItemDto[]> {
    const res = await fetch('/api/tournaments')
    if (!res.ok) throw new Error('Load failed')
    return res.json()
}

async function fetchParticipants(): Promise<ParticipantDto[]> {
    const res = await fetch('/api/participants')
    if (!res.ok) throw new Error('Failed to load participants')
    return res.json()
}

async function createTournament(payload: CreateTournamentPayload): Promise<TournamentListItemDto> {
    const res = await fetch('/api/tournaments', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(payload),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error((data as ApiError)?.message || 'Create failed')
    return data
}

export default function TournamentsPage() {
    const qc = useQueryClient()
    const {data: me} = useQuery({queryKey: ['me'], queryFn: getAdmin})
    const isAdmin = !!me?.isAdmin


    const {data: rows = []} = useQuery<TournamentListItemDto[]>({
        queryKey: ['tournaments'],
        queryFn: fetchTournaments,
    })

    const createMut = useMutation<TournamentListItemDto, Error, CreateTournamentPayload>({
        mutationFn: createTournament,
        onSuccess: () => {
            toast.success('Turniej utworzony')
            qc.invalidateQueries({queryKey: ['tournaments']})
        },
        onError: (e) => toast.error(e.message),
    })

    return (
        <div className="max-w-3xl mx-auto p-6 space-y-6 pt-20">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">Turnieje</h1>
                {isAdmin && <NewTournamentDialog onCreate={(p) => createMut.mutate(p)}/>}
            </div>

            <ul className="space-y-3">
                {rows.map((t) => {
                    const last = t.matches?.[0]
                    return (
                        <li key={t.id} className="flex items-center justify-between rounded-lg border p-3 bg-white/5">
                            <div className="flex flex-col gap-2">
                                <div className="font-semibold">{t.title}</div>
                                <div className="text-sm text-gray-400 flex flex-col">
                                    <span>Nagroda główna: {t.mainPrize}</span>
                                    <span>Nagroda za każdą rundę: {t.matchWinPrize}</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                {last && <span className="text-sm">Zwycięzca: <em>rozstrzygnięty</em></span>}
                                <Button asChild size="sm">
                                    <Link href={`/tournaments/${t.id}`}>Otwórz</Link>
                                </Button>
                            </div>
                        </li>
                    )
                })}
            </ul>
        </div>
    )
}

function NewTournamentDialog({onCreate}: { onCreate: (payload: CreateTournamentPayload) => void }) {
    const [open, setOpen] = useState(false)
    const [type, setType] = useState<TournamentType>(TournamentType.SOLO)
    const [title, setTitle] = useState('')
    const [mainPrize, setMainPrize] = useState<number>(10)
    const [matchWinPrize, setMatchWinPrize] = useState<number>(2)
    const [teamA, setTeamA] = useState<{ name: string; memberIds: string[] }>({name: 'eryk huj', memberIds: []})
    const [teamB, setTeamB] = useState<{ name: string; memberIds: string[] }>({name: 'Kurwiorze', memberIds: []})
    const [participantIds, setParticipantIds] = useState<string[]>([])
    const {data: participantList = []} = useQuery({
        queryKey: ['participants'],
        queryFn: fetchParticipants,
    })

    const participantOptions = participantList.map(p => ({
        value: p.id,
        label: p.name,
    }))

    const optionsForTeamA = useMemo(
        () => participantOptions.filter(o => !teamB.memberIds.includes(o.value)),
        [participantOptions, teamB.memberIds]
    )
    const optionsForTeamB = useMemo(
        () => participantOptions.filter(o => !teamA.memberIds.includes(o.value)),
        [participantOptions, teamA.memberIds]
    )
    const dedupe = (xs: string[]) => Array.from(new Set(xs))
    const hasOverlap = (a: string[], b: string[]) => a.some(id => b.includes(id))

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button>+ Nowy</Button></DialogTrigger>
            <DialogContent>
                <DialogHeader><DialogTitle>Nowy turniej</DialogTitle></DialogHeader>
                <div className="flex flex-col gap-3">
                    <Label className="mt-3" htmlFor="id">Typ turnieju</Label>
                    <Select value={type} onValueChange={(v) => setType(v as TournamentType)}>
                        <SelectTrigger id="type"><SelectValue placeholder="Typ"/></SelectTrigger>
                        <SelectContent>
                            <SelectItem value={TournamentType.SOLO}>SOLO (1v1)</SelectItem>
                            <SelectItem value={TournamentType.TEAM}>TEAM vs TEAM</SelectItem>
                        </SelectContent>
                    </Select>
                    <Label className="mt-3" htmlFor="tournamentTitle">Tytuł turnieju</Label>
                    <Input id="tournamentTitle" value={title} onChange={(e) => setTitle(e.target.value)}
                           placeholder="Tytuł turnieju"/>
                    <Label className="mt-3" htmlFor="mainPrize">Nagroda główna</Label>
                    <Input
                        type="number"
                        value={Number.isNaN(mainPrize) ? '' : mainPrize}
                        onChange={(e) => setMainPrize(Number(e.target.value))}
                        placeholder="Nagroda główna"
                        inputMode="numeric"
                        id="mainPrize"
                    />

                    {type === TournamentType.SOLO ? (
                        <>
                            <Label className="mt-3" htmlFor="matchWinPrize">Nagroda za mecz</Label>
                            <Input
                                type="number"
                                value={Number.isNaN(matchWinPrize) ? '' : matchWinPrize}
                                onChange={(e) => setMatchWinPrize(Number(e.target.value))}
                                placeholder="Nagroda za mecz"
                                inputMode="numeric"
                                id="matchWinPrize"
                            />
                            <Label className="mt-3" htmlFor="tournamentParticipants">Uczestnicy</Label>
                            <MultiSelect
                                id="tournamentParticipants"
                                options={participantOptions}
                                value={participantIds}
                                onValueChange={setParticipantIds}
                                placeholder="Wybierz uczestników"
                            />
                        </>
                    ) : (
                        <>
                            <Label htmlFor="tournamentTeamAName" className="mt-3">Nazwa Zespołu A</Label>
                            <Input
                                id="tournamentTeamAName"
                                value={teamA.name}
                                onChange={(e) => setTeamA({...teamA, name: e.target.value})}
                                placeholder="Nazwa Drużyny A"
                            />

                            <Label htmlFor="tournamentTeamAParticipants" className="mt-3">Uczestnicy Zespołu A</Label>
                            <MultiSelect
                                id="tournamentTeamAParticipants"
                                options={optionsForTeamA}
                                value={teamA.memberIds}
                                onValueChange={(vals) =>
                                    setTeamA({
                                        ...teamA,
                                        memberIds: dedupe(vals.filter(id => !teamB.memberIds.includes(id))),
                                    })
                                }
                                placeholder="Skład Drużyny A"
                            />
                            <Label className="mt-3" htmlFor="tournamentTeamBName">Nazwa Zespołu B</Label>
                            <Input
                                id="tournamentTeamBName"
                                value={teamB.name}
                                onChange={(e) => setTeamB({...teamB, name: e.target.value})}
                                placeholder="Nazwa Drużyny B"
                            />
                            <Label className="mt-3" htmlFor="tournamentTeamBParticipants">Uczestnicy Zespołu B</Label>
                            <MultiSelect
                                id="tournamentTeamBParticipants"
                                options={optionsForTeamB}
                                value={teamB.memberIds}
                                onValueChange={(vals) =>
                                    setTeamB({
                                        ...teamB,
                                        memberIds: dedupe(vals.filter(id => !teamA.memberIds.includes(id))),
                                    })
                                }
                                placeholder="Skład Drużyny B"
                            />
                        </>
                    )}

                    <Button
                        onClick={() => {
                            if (!title.trim()) return toast.error('Podaj tytuł')

                            if (type === TournamentType.SOLO) {
                                if (participantIds.length < 2) return toast.error('Wybierz co najmniej 2 uczestników')

                                const payload: CreateTournamentPayload = {
                                    type: TournamentType.SOLO,
                                    title,
                                    mainPrize,
                                    matchWinPrize,
                                    participantIds,
                                }
                                onCreate(payload)
                                setOpen(false)
                                return
                            }

                            if (!teamA.name.trim() || !teamB.name.trim())
                                return toast.error('Nazwij oba zespoły')

                            if (teamA.memberIds.length === 0 || teamB.memberIds.length === 0)
                                return toast.error('Każdy zespół musi mieć co najmniej jednego członka')

                            if (hasOverlap(teamA.memberIds, teamB.memberIds))
                                return toast.error('Ten sam uczestnik nie może być w obu zespołach')

                            const payload: CreateTournamentPayload = {
                                type: TournamentType.TEAM,
                                title,
                                mainPrize,
                                matchWinPrize,
                                teamA,
                                teamB,
                            }
                            onCreate(payload)
                            setOpen(false)
                        }}
                    >
                        Utwórz
                    </Button>

                </div>
            </DialogContent>
        </Dialog>
    )
}
