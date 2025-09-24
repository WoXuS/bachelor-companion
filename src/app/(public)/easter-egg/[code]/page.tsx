'use client'

import * as React from 'react'
import {useParams} from 'next/navigation'
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query'
import {Button} from '@/components/ui/button'
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select'
import {toast} from 'sonner'
import {CustomLoader} from '@/components/ui/CustomLoader'
import {ParticipantDto} from '@/types/participant'
import {getAdmin} from '@/hooks/useAdmin'
import {EasterEggDto} from "@/types/easter-egg";
import {errMsg} from "@/lib/error";


async function fetchEggByCode(code: string): Promise<EasterEggDto> {
    const r = await fetch(`/api/easter-eggs/by-code/${encodeURIComponent(code)}`, {cache: 'no-store'})
    const d = await r.json()
    if (!r.ok) throw new Error(d?.message || 'Load failed')
    return d
}

async function fetchParticipants(): Promise<ParticipantDto[]> {
    const r = await fetch('/api/participants', {cache: 'no-store'})
    if (!r.ok) throw new Error('Load participants failed')
    return r.json()
}

async function claimByCode(code: string, participantId: string) {
    const r = await fetch(`/api/easter-eggs/by-code/${encodeURIComponent(code)}`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({participantId}),
    })
    const d = await r.json().catch(() => ({}))
    if (!r.ok) throw new Error(d?.message || 'Claim failed')
    return d
}

async function reactivateEgg(id: string) {
    const r = await fetch(`/api/easter-eggs/${id}/reactivate`, {method: 'POST'})
    const d = await r.json().catch(() => ({}))
    if (!r.ok) throw new Error(d?.message || 'Reactivate failed')
    return d
}

export default function EasterEggByCodePage() {
    const {code} = useParams() as { code: string }
    const qc = useQueryClient()
    const {data: me} = useQuery({queryKey: ['me'], queryFn: getAdmin})
    const isAdmin = !!me?.isAdmin

    const {data: egg, isLoading} = useQuery({
        queryKey: ['egg-by-code', code],
        queryFn: () => fetchEggByCode(code),
    })
    const {data: participants = []} = useQuery({
        queryKey: ['participants'],
        queryFn: fetchParticipants,
        enabled: !!egg?.active,
    })

    const [selected, setSelected] = React.useState<string>('')

    const claimMut = useMutation({
        mutationFn: () => claimByCode(code, selected),
        onSuccess: () => {
            toast.success('Przyznano 50 $pruch')
            qc.invalidateQueries({queryKey: ['egg-by-code', code]})
            qc.invalidateQueries({queryKey: ['participants']})
            qc.invalidateQueries({queryKey: ['transactions']})
        },
        onError: (e) => toast.error(errMsg(e)),
    })

    const reactivateMut = useMutation({
        mutationFn: () => reactivateEgg(egg!.id),
        onSuccess: () => {
            toast.success('Przywrócono do gry')
            qc.invalidateQueries({queryKey: ['egg-by-code', code]})
        },
        onError: (e) => toast.error(errMsg(e)),
    })

    if (isLoading || !egg) return <CustomLoader/>

    const title = egg.type === 'PHYSICAL' ? 'Gratulacje! Znalazłeś fizycznego easter egga.' : 'Gratulacje! Znalazłeś wirtualnego easter egga.'
    return (
        <div className="mx-auto flex max-w-md flex-col gap-4 pt-20 p-6">
            <h1 className="text-2xl font-bold">{title}</h1>

            {egg.active ? (
                <div className="rounded-lg border bg-white/5 p-4 flex flex-col gap-3">
                    <p className="text-sm">
                        To jajko jest warte <strong className="text-primary">50 $pruch</strong>. Wybierz poniżej, kim jesteś, aby odebrać punkty.
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
                    <p className="text-base text-destructive">
                        To jajko zostało już znalezione.
                    </p>
                    {egg.claimedBy && (
                        <p className="text-xs text-gray-400">
                            znalazł: <b
                            className="text-primary">{egg.claimedBy.name}</b>{egg.claimedAt ? `, ${new Date(egg.claimedAt).toLocaleString()}` : ''}
                        </p>
                    )}
                    {isAdmin && (
                        <div className="flex items-center gap-2">
                            <Button
                                variant="secondary"
                                onClick={() => reactivateMut.mutate()}
                                disabled={reactivateMut.isPending}
                            >
                                {reactivateMut.isPending ? 'Przywracanie…' : 'Przywróć'}
                            </Button>
                            <p className="text-xs text-gray-400">
                                Przywracanie dotyczy głównie jajek <i>fizycznych</i>.
                            </p>
                        </div>
                    )}
                </div>
            )}
            {egg?.counts && (
                <div className="rounded-lg border bg-white/10 p-4 flex flex-col gap-3">
                    <p className="text-xs text-muted-foreground">
                        Pozostało <b>{egg.counts.remaining}</b> z <b>{egg.counts.total}</b> aktywnych
                        jajek {egg.type === 'PHYSICAL' ? 'fizycznych' : 'wirtualnych'}
                    </p>
                </div>

            )}
            {isAdmin &&
                <div className="rounded-lg border bg-white/5 p-4 text-xs text-gray-400">
                    {egg.label && <p><span className="text-gray-500">Etykieta:</span> <span
                        className="text-gray-300">{egg.label}</span></p>}
                    <p><span className="text-gray-500">ID:</span> <span className="font-mono">{egg.id}</span></p>
                    <p><span className="text-gray-500">Numer:</span> {egg.number}</p>
                    <p><span className="text-gray-500">Typ:</span> {egg.type}</p>
                    <p><span className="text-gray-500">Status:</span> {egg.active ? 'AKTYWNY' : 'NIEAKTYWNY'}</p>
                </div>
            }
        </div>
    )
}
