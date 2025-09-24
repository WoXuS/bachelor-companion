'use client'

import * as React from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query'
import {Button} from '@/components/ui/button'
import {Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger} from '@/components/ui/dialog'
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select'
import {toast} from 'sonner'
import {EasterEggDto} from "@/types/easter-egg";
import {errMsg} from "@/lib/error";

type Participant = { id: string; name: string }

const mountedIds = new Set<string>()

async function fetchEgg(id: string): Promise<EasterEggDto | null> {
    const r = await fetch(`/api/easter-eggs/${id}`, { cache: 'no-store' })
    if (r.status === 404) return null
    const d = await r.json()
    if (!r.ok) throw new Error(d?.message || 'Load failed')
    return d
}

async function fetchParticipants(): Promise<Participant[]> {
    const r = await fetch('/api/participants', { cache: 'no-store' })
    const d = await r.json()
    if (!r.ok) throw new Error(d?.message || 'Load participants failed')
    return d
}

async function claimEgg(id: string, participantId: string) {
    const r = await fetch(`/api/easter-eggs/${id}/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participantId }),
    })
    const d = await r.json().catch(() => ({}))
    if (!r.ok) throw new Error(d?.message || 'Claim failed')
    return d
}

type EggMin = { id: string; code: string; active: boolean }

async function fetchByPlacement(key: string): Promise<EggMin | null> {
    const r = await fetch(`/api/easter-eggs/placement/${encodeURIComponent(key)}`, { cache: 'no-store' })
    if (!r.ok) return null
    const d = await r.json()
    if (!d) return null
    return { id: d.id, code: d.code, active: d.active }
}

export default function VirtualEggButton({
                                             placementKey,
                                             imgSrc = '/images/easter-egg.png',
                                             size = 24,
                                             className = 'opacity-60 hover:opacity-100 transition-opacity cursor-pointer',
                                         }: {
    placementKey: string
    imgSrc?: string
    size?: number
    className?: string
}) {
    const { data } = useQuery({
        queryKey: ['egg-slot', placementKey],
        queryFn: () => fetchByPlacement(placementKey),
    })
    if (!data || !data.active) return null

    return (
        <DuplicateGate id={data.id}>
            <ActiveVirtualEggButtonInner
                id={data.id}
                placementKey={placementKey}
                imgSrc={imgSrc}
                size={size}
                className={className}
            />
        </DuplicateGate>
    )
}

/** Bramka – tu NIE ma useQuery. Może warunkowo renderować dzieci bez łamania zasad hooków. */
function DuplicateGate({ id, children }: { id: string; children: React.ReactNode }) {
    const [show, setShow] = React.useState(true)

    React.useEffect(() => {
        if (!id) return
        if (mountedIds.has(id)) {
            console.warn(`[EasterEgg] duplicate render for id=${id} on the same page — hiding the duplicate`)
            setShow(false)
            return
        }
        mountedIds.add(id)
        return () => {
            mountedIds.delete(id)
        }
    }, [id])

    if (!show) return null
    return <>{children}</>
}

/** Wewnętrzny komponent – wszystkie hooki są zawsze wołane po zamontowaniu. */
function ActiveVirtualEggButtonInner({
                                         id,
                                         imgSrc = '/images/easter-egg.png',
                                         size = 24,
                                         className = 'opacity-60 hover:opacity-100 transition-opacity cursor-pointer',
                                         ariaLabel = 'Easter Egg',
                                         placementKey = '',
                                     }: {
    id: string
    imgSrc?: string
    size?: number
    className?: string
    ariaLabel?: string
    placementKey?: string
}) {
    const [open, setOpen] = React.useState(false)
    const qc = useQueryClient()

    const { data: egg, isLoading: eggLoading } = useQuery({
        queryKey: ['egg', id],
        queryFn: () => fetchEgg(id),
        enabled: open,
    })

    const { data: participants = [] } = useQuery({
        queryKey: ['participants'],
        queryFn: fetchParticipants,
        enabled: open && !!egg?.active,
    })

    const [selected, setSelected] = React.useState<string>('')

    const claimMut = useMutation({
        mutationFn: () => claimEgg(id, selected),
        onSuccess: () => {
            toast.success('Przyznano 50 $pruch')
            qc.invalidateQueries({ queryKey: ['egg', id] })
            qc.invalidateQueries({ queryKey: ['participants'] })
            qc.invalidateQueries({ queryKey: ['egg-slot', placementKey] })
            qc.invalidateQueries({ queryKey: ['transactions'] })
            setSelected('')
            setOpen(false)
        },
        onError: (e) => toast.error(errMsg(e)),
    })

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Image src={imgSrc} width={size} height={size} alt={ariaLabel} className={className} />
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>
                        🎉 Przyczajony Kawaler 🎉 {egg && <span className="text-gray-500 text-base">#{egg.number}</span>}
                    </DialogTitle>
                </DialogHeader>

                {eggLoading ? (
                    <p className="text-sm text-muted-foreground">Ładuję jajko…</p>
                ) : !egg ? (
                    <p className="text-destructive">Nie znaleziono jajka.</p>
                ) : !egg.active ? (
                    <div className="space-y-2">
                        <p className="text-destructive">To jajko jest już nieaktywne.</p>
                        <p className="text-xs text-muted-foreground">
                            Możesz też przejść do strony:{' '}
                            <Link className="underline" href={`/easter-egg/${egg.code}`}>/easter-egg/{egg.code}</Link>
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        <p className="text-sm">
                            Gratulacje! Znalazłeś easter egga - <i className="text-gray-400">"{egg.label ?? 'wirtualnego'}"</i>
                        </p>
                        <p className="text-sm">
                            Wartość: <strong className="text-primary">50 $pruch</strong>. Wybierz poniżej kim jesteś aby odebrać swoje punkty.
                        </p>

                        <div className="flex items-center gap-2">
                            <Select onValueChange={setSelected} value={selected || undefined}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Wybierz" />
                                </SelectTrigger>
                                <SelectContent>
                                    {participants.map((p) => (
                                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Button onClick={() => selected && claimMut.mutate()} disabled={!selected || claimMut.isPending}>
                                Odbierz punkty
                            </Button>
                        </div>
                        {egg?.counts && (
                            <p className="text-xs text-muted-foreground">
                                Pozostało aktywnych jajek: <b>{egg.counts.remaining}</b> z <b>{egg.counts.total}</b>
                            </p>
                        )}
                    </div>
                )}
            </DialogContent>
        </Dialog>
    )
}
