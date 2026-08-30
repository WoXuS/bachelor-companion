import {useMemo, useState} from "react";
import {useQuery} from "@tanstack/react-query";
import {Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger} from "@/components/ui/dialog";
import {Button} from "@/components/ui/button";
import {Label} from "@/components/ui/label";
import {Input} from "@/components/ui/input";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import {toast} from "sonner";
import {TournamentType} from '@/types/tournament';
import {MultiSelect} from "@/components/ui/multi-select";
import {CreateTournamentPayload} from "@/types/api";
import {fetchParticipants} from '@/hooks/queries'


export function NewTournamentDialog({onCreate}: { onCreate: (payload: CreateTournamentPayload) => void }) {
    const [open, setOpen] = useState(false)
    const [type, setType] = useState<TournamentType>(TournamentType.SOLO)
    const [title, setTitle] = useState('')
    const [mainPrize, setMainPrize] = useState<number>(200)
    const [consolationPrize, setConsolationPrize] = useState<number>(120)
    const [matchWinPrize, setMatchWinPrize] = useState<number>(40)
    const [teamA, setTeamA] = useState<{ name: string; memberIds: string[] }>({name: '', memberIds: []})
    const [teamB, setTeamB] = useState<{ name: string; memberIds: string[] }>({name: '', memberIds: []})
    const [participantIds, setParticipantIds] = useState<string[]>([])
    const {data: participantList = []} = useQuery({queryKey: ['participants'], queryFn: fetchParticipants})

    const options = useMemo(() => participantList.map(p => ({value: p.id, label: p.name})), [participantList])
    const optionsForTeamA = useMemo(() => options.filter(o => !teamB.memberIds.includes(o.value)), [options, teamB.memberIds])
    const optionsForTeamB = useMemo(() => options.filter(o => !teamA.memberIds.includes(o.value)), [options, teamA.memberIds])
    const dedupe = (xs: string[]) => Array.from(new Set(xs))
    const hasOverlap = (a: string[], b: string[]) => a.some(id => b.includes(id))

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button variant="secondary">+ Nowy</Button></DialogTrigger>
            <DialogContent className="max-h-[80vh] overflow-y-auto">
                <DialogHeader><DialogTitle>Nowy turniej</DialogTitle></DialogHeader>
                <div className="flex flex-col gap-3">
                    <Label>Typ turnieju</Label>
                    <Select value={type} onValueChange={(v) => setType(v as TournamentType)}>
                        <SelectTrigger><SelectValue placeholder="Typ"/></SelectTrigger>
                        <SelectContent>
                            <SelectItem value={TournamentType.SOLO}>SOLO</SelectItem>
                            <SelectItem value={TournamentType.TEAM}>TEAM vs TEAM</SelectItem>
                        </SelectContent>
                    </Select>

                    <Label>Tytuł</Label>
                    <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Tytuł turnieju"/>

                    <Label>{type === "SOLO" ? 'Nagroda główna' : 'Nagroda na osobę'}</Label>
                    <Input type="number" value={Number.isNaN(mainPrize) ? '' : mainPrize}
                           onChange={(e) => setMainPrize(Number(e.target.value))} inputMode="numeric"/>
                    {type === "SOLO" && (
                        <>
                            <Label>Nagroda drabinki przegranych</Label>
                            <Input type="number" value={Number.isNaN(consolationPrize) ? '' : consolationPrize}
                                   onChange={(e) => setConsolationPrize(Number(e.target.value))}
                                   inputMode="numeric"/>
                        </>
                    )}


                    {type === TournamentType.SOLO ? (
                        <>
                            <Label>Nagroda za mecz</Label>
                            <Input type="number" value={Number.isNaN(matchWinPrize) ? '' : matchWinPrize}
                                   onChange={(e) => setMatchWinPrize(Number(e.target.value))} inputMode="numeric"/>

                            <Label>Uczestnicy</Label>
                            <MultiSelect options={options} value={participantIds}
                                         onValueChange={setParticipantIds} placeholder="Wybierz uczestników"
                                         className="bg-input/30 hover:bg-input/50"/>
                        </>
                    ) : (
                        <>
                            <Label>Nazwa Zespołu A</Label>
                            <Input value={teamA.name} onChange={(e) => setTeamA({...teamA, name: e.target.value})}
                                   placeholder="Drużyna A"/>
                            <Label>Skład Zespołu A</Label>
                            <MultiSelect options={optionsForTeamA} value={teamA.memberIds}
                                         onValueChange={(vals) => setTeamA({
                                             ...teamA,
                                             memberIds: dedupe(vals.filter(id => !teamB.memberIds.includes(id)))
                                         })}
                                         placeholder="Skład" className="bg-input/30 hover:bg-input/50"/>
                            <Label>Nazwa Zespołu B</Label>
                            <Input value={teamB.name} onChange={(e) => setTeamB({...teamB, name: e.target.value})}
                                   placeholder="Drużyna B"/>
                            <Label>Skład Zespołu B</Label>
                            <MultiSelect options={optionsForTeamB} value={teamB.memberIds}
                                         onValueChange={(vals) => setTeamB({
                                             ...teamB,
                                             memberIds: dedupe(vals.filter(id => !teamA.memberIds.includes(id)))
                                         })}
                                         placeholder="Skład" className="bg-input/30 hover:bg-input/50"/>
                        </>
                    )}

                    <Button onClick={() => {
                        if (!title.trim()) return toast.error('Podaj tytuł')

                        if (type === TournamentType.SOLO) {
                            if (participantIds.length < 2) return toast.error('Wybierz co najmniej 2 uczestników')
                            onCreate({
                                type: TournamentType.SOLO,
                                title,
                                mainPrize,
                                matchWinPrize,
                                consolationPrize,
                                participantIds
                            })
                            setOpen(false);
                            return
                        }

                        if (!teamA.name.trim() || !teamB.name.trim()) return toast.error('Nazwij oba zespoły')
                        if (!teamA.memberIds.length || !teamB.memberIds.length) return toast.error('Każdy zespół musi mieć co najmniej jednego członka')
                        if (hasOverlap(teamA.memberIds, teamB.memberIds)) return toast.error('Ten sam uczestnik nie może być w obu zespołach')

                        onCreate({
                            type: TournamentType.TEAM,
                            title,
                            mainPrize,
                            matchWinPrize,
                            consolationPrize,
                            teamA,
                            teamB
                        })
                        setOpen(false)
                    }}>Utwórz</Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}

export function NewDuelDialog({onCreate}: {
    onCreate: (p: { title: string; stake: number; playerAId: string; playerBId: string }) => void
}) {
    const [open, setOpen] = useState(false)
    const [title, setTitle] = useState('')
    const [stake, setStake] = useState<number>(40)
    const [playerAId, setPlayerAId] = useState<string>('')
    const [playerBId, setPlayerBId] = useState<string>('')

    const {data: participantList = []} = useQuery({queryKey: ['participants'], queryFn: fetchParticipants})
    const options = useMemo(() => participantList.map(p => ({value: p.id, label: p.name})), [participantList])

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button variant="secondary">+ Nowy 1v1</Button></DialogTrigger>
            <DialogContent>
                <DialogHeader><DialogTitle>Nowy pojedynek 1v1</DialogTitle></DialogHeader>
                <div className="flex flex-col gap-3">
                    <Label>Tytuł</Label>
                    <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Np. Bilard"/>
                    <Label>Stawka</Label>
                    <Input type="number" value={Number.isNaN(stake) ? '' : stake}
                           onChange={(e) => setStake(Number(e.target.value))} inputMode="numeric"/>
                    <Label>Gracz A</Label>
                    <Select value={playerAId} onValueChange={setPlayerAId}>
                        <SelectTrigger><SelectValue placeholder="Wybierz"/></SelectTrigger>
                        <SelectContent>{options.map(o => <SelectItem key={o.value}
                                                                     value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                    </Select>
                    <Label>Gracz B</Label>
                    <Select value={playerBId} onValueChange={setPlayerBId}>
                        <SelectTrigger><SelectValue placeholder="Wybierz"/></SelectTrigger>
                        <SelectContent>{options.map(o => <SelectItem key={o.value}
                                                                     value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                    </Select>

                    <Button onClick={() => {
                        if (!title.trim()) return toast.error('Podaj tytuł')
                        if (!playerAId || !playerBId) return toast.error('Wybierz obu graczy')
                        if (playerAId === playerBId) return toast.error('Inny gracz po obu stronach')
                        onCreate({title, stake, playerAId, playerBId});
                        setOpen(false)
                    }}>Utwórz</Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}