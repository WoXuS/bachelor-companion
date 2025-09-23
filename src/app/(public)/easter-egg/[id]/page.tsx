'use client'

import * as React from 'react'
import {useParams} from 'next/navigation'
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query'
import {Button} from '@/components/ui/button'
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select'
import {toast} from 'sonner'
import {CustomLoader} from '@/components/ui/CustomLoader'
import {ParticipantDto} from '@/types/participant'
import {getAdmin} from "@/hooks/useAdmin";

type Egg = {
    id: string
    number: number
    type: 'PHYSICAL' | 'VIRTUAL'
    active: boolean
    claimedAt?: string | null
    claimedBy?: { id: string; name: string } | null
    label?: string | null
}

async function fetchEgg(id: string): Promise<Egg> {
    const r = await fetch(`/api/easter-eggs/${id}`, {cache: 'no-store'})
    const d = await r.json()
    if (!r.ok) throw new Error(d?.message || 'Load failed')
    return d
}

async function fetchParticipants(): Promise<ParticipantDto[]> {
    const r = await fetch('/api/participants')
    if (!r.ok) throw new Error('Load participants failed')
    return r.json()
}

async function claimEgg(id: string, participantId: string) {
    const r = await fetch(`/api/easter-eggs/${id}/claim`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({participantId})
    })
    const d = await r.json()
    if (!r.ok) throw new Error(d?.message || 'Claim failed')
    return d
}

async function reactivateEgg(id: string) {
    const r = await fetch(`/api/easter-eggs/${id}/reactivate`, {method: 'POST'})
    const d = await r.json()
    if (!r.ok) throw new Error(d?.message || 'Reactivate failed')
    return d
}

export default function EasterEggPage() {
    const {id} = useParams() as { id: string }
    const qc = useQueryClient()
    const {data: me} = useQuery({queryKey: ['me'], queryFn: getAdmin})
    const isAdmin = !!me?.isAdmin

    const {data: egg, isLoading} = useQuery({queryKey: ['egg', id], queryFn: () => fetchEgg(id)})
    const {data: participants = []} = useQuery({queryKey: ['participants'], queryFn: fetchParticipants})

    const [selected, setSelected] = React.useState<string>('')

    const claimMut = useMutation({
        mutationFn: () => claimEgg(id, selected),
        onSuccess: () => {
            toast.success('Przyznano 50 $pruch')
            qc.invalidateQueries({queryKey: ['egg', id]})
            qc.invalidateQueries({queryKey: ['participants']})
            qc.invalidateQueries({queryKey: ['transactions']})
        },
        onError: (e: any) => toast.error(e?.message),
    })

    const reactivateMut = useMutation({
        mutationFn: () => reactivateEgg(id),
        onSuccess: () => {
            toast.success('Przywrócono do gry')
            qc.invalidateQueries({queryKey: ['egg', id]})
        },
        onError: (e: any) => toast.error(e?.message),
    })

    if (isLoading || !egg) return <CustomLoader/>

    const title = egg.type === 'PHYSICAL' ? 'Gratulacje! Znalazłeś fizycznego easter egga.' : 'Gratulacje! Znalazłeś wirtualnego easter egga.'

    return (
        <div className="mx-auto flex max-w-md flex-col gap-4 pt-20 p-6">
            <h1 className="text-2xl font-bold">{title}</h1>
            <div className="rounded-lg border bg-white/5 p-4">
                <p className="text-sm text-gray-300">ID: <span className="font-mono">{egg.id}</span></p>
                <p className="text-sm text-gray-300">Numer: <span className="font-semibold">{egg.number}</span></p>
                <p className="text-sm text-gray-300">Typ: {egg.type}</p>
                {!egg.active && (
                    <p className="mt-2 text-sm text-red-400">Ten easter egg jest już nieaktywny{egg.claimedBy && <> —
                        odebrał: <b>{egg.claimedBy.name}</b></>}.</p>
                )}
            </div>

            {egg.active ? (
                <div className="rounded-lg border bg-white/5 p-4 flex flex-col gap-3">
                    <p className="text-sm">
                        To jajko jest warte <strong>50 $pruch</strong>. Wybierz poniżej, kim jesteś, aby odebrać punkty.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
                        <Select onValueChange={setSelected} value={selected || undefined}>
                            <SelectTrigger className="w-64">
                                <SelectValue placeholder="Wybierz uczestnika"/>
                            </SelectTrigger>
                            <SelectContent>
                                {participants.map((p) => (
                                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Button
                            onClick={() => selected && claimMut.mutate()}
                            disabled={!selected || claimMut.isPending}
                        >
                            {claimMut.isPending ? 'Przyznawanie…' : 'Odbierz punkty'}
                        </Button>
                    </div>

                    <p className="text-xs text-gray-400">
                        Po odebraniu to jajko zostanie oznaczone jako <span className="font-medium">nieaktywne</span>.
                    </p>
                </div>
            ) : (
                <div className="rounded-lg border bg-white/5 p-4 flex flex-col gap-3">
                    <p className="text-sm">
                        To jajko zostało już zebrane
                        {egg.claimedBy && (
                            <> —
                                odebrał(a): <b>{egg.claimedBy.name}</b>{egg.claimedAt ? `, ${new Date(egg.claimedAt).toLocaleString()}` : ''}</>
                        )}
                        .
                    </p>
                    {isAdmin && (
                        <div className="flex items-center gap-2">
                            <Button
                                variant="secondary"
                                onClick={() => reactivateMut.mutate()}
                                disabled={reactivateMut.isPending}
                            >
                                {reactivateMut.isPending ? 'Przywracanie…' : 'Przywróć do gry (admin)'}
                            </Button>
                            <p className="text-xs text-gray-400">
                                Przywracanie dotyczy głównie jajek <i>fizycznych</i>.
                            </p>
                        </div>
                    )}
                </div>
            )}

            {/* Meta / szczegóły (przydatne dla admina i do debugowania QR) */}
            <div className="rounded-lg border bg-white/5 p-4 text-xs text-gray-400">
                {egg.label && <p><span className="text-gray-500">Etykieta:</span> <span
                    className="text-gray-300">{egg.label}</span></p>}
                <p><span className="text-gray-500">ID:</span> <span className="font-mono">{egg.id}</span></p>
                <p><span className="text-gray-500">Numer:</span> {egg.number}</p>
                <p><span className="text-gray-500">Typ:</span> {egg.type}</p>
                <p><span className="text-gray-500">Status:</span> {egg.active ? 'AKTYWNY' : 'NIEAKTYWNY'}</p>
            </div>
        </div>
    )
}