'use client'

import * as React from 'react'
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query'
import {Button} from '@/components/ui/button'
import {Input} from '@/components/ui/input'
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select'
import {toast} from 'sonner'
import Link from 'next/link'
import {EasterEggDto} from "@/types/easter-egg";
import {errMsg} from "@/lib/error";

async function fetchEggs(): Promise<EasterEggDto[]> {
    const r = await fetch('/api/easter-eggs', {cache: 'no-store'})
    const d = await r.json()
    if (!r.ok) throw new Error(d?.message || 'Load failed')
    return d
}

async function reactivateEgg(id: string) {
    const r = await fetch(`/api/easter-eggs/${id}/reactivate`, {method: 'POST'})
    const d = await r.json()
    if (!r.ok) throw new Error(d?.message || 'Reactivate failed')
    return d
}

export default function EasterEggsAdmin() {
    const qc = useQueryClient()
    const {data: eggs = [], isLoading} = useQuery({queryKey: ['eggs'], queryFn: fetchEggs})

    const [q, setQ] = React.useState('')
    const [typeFilter, setTypeFilter] = React.useState<'ALL' | 'PHYSICAL' | 'VIRTUAL'>('ALL')
    const [statusFilter, setStatusFilter] = React.useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL')

    const reactivateMut = useMutation({
        mutationFn: (id: string) => reactivateEgg(id),
        onSuccess: () => {
            toast.success('Przywrócono jajko do gry')
            qc.invalidateQueries({queryKey: ['eggs']})
        },
        onError: (e) => toast.error(errMsg(e)),
    })

    const filtered = React.useMemo(() => {
        const qn = q.trim().toLowerCase()
        return eggs
            .filter(e => typeFilter === 'ALL' || e.type === typeFilter)
            .filter(e => statusFilter === 'ALL' || (statusFilter === 'ACTIVE' ? e.active : !e.active))
            .filter(e =>
                !qn ||
                String(e.number).includes(qn) ||
                (e.label ?? '').toLowerCase().includes(qn) ||
                (e.claimedBy?.name ?? '').toLowerCase().includes(qn)
            )
            .sort((a, b) => {
                if (a.active !== b.active) return a.active ? -1 : 1
                if (a.type !== b.type) return a.type.localeCompare(b.type)
                return a.number - b.number
            })
    }, [eggs, q, typeFilter, statusFilter])

    return (
        <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
                <Input value={q} onChange={e => setQ(e.target.value)}
                       placeholder="Szukaj: numer / etykieta / kto zebrał" className="w-72"/>
                <Select value={typeFilter} onValueChange={(v: 'ALL' | 'PHYSICAL' | 'VIRTUAL') => setTypeFilter(v)}>
                    <SelectTrigger className="w-36"><SelectValue placeholder="Typ"/></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="ALL">Wszystkie typy</SelectItem>
                        <SelectItem value="PHYSICAL">Fizyczne</SelectItem>
                        <SelectItem value="VIRTUAL">Wirtualne</SelectItem>
                    </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={(v: 'ALL' | 'ACTIVE' | 'INACTIVE') => setStatusFilter(v)}>
                    <SelectTrigger className="w-40"><SelectValue placeholder="Status"/></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="ALL">Wszystkie</SelectItem>
                        <SelectItem value="ACTIVE">Aktywne</SelectItem>
                        <SelectItem value="INACTIVE">Nieaktywne</SelectItem>
                    </SelectContent>
                </Select>
                <div className="ml-auto text-sm text-muted-foreground">
                    {isLoading ? 'Ładowanie…' : <>Razem: <b>{eggs.length}</b> • Filtr: <b>{filtered.length}</b></>}
                </div>
            </div>

            <ul className="divide-y divide-white/10 rounded-lg border bg-white/5">
                {filtered.map(e => (
                    <li key={e.id} className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:gap-3">
                        <div className="flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                                <span
                                    className="rounded-md bg-white/10 px-2 py-0.5 text-xs font-semibold">#{e.number}</span>
                                <span className={`rounded-md border px-2 py-0.5 text-xs ${e.type === 'PHYSICAL'
                                    ? 'border-sky-500/30 bg-sky-500/10 text-sky-300'
                                    : 'border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-300'}`}>
                  {e.type === 'PHYSICAL' ? 'FIZYCZNE' : 'WIRTUALNE'}
                </span>
                                <span className={`rounded-md border px-2 py-0.5 text-xs ${e.active
                                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                                    : 'border-gray-500/30 bg-gray-500/10 text-gray-300'}`}>
                  {e.active ? 'AKTYWNE' : 'NIEAKTYWNE'}
                </span>
                                {e.label && <span
                                    className="text-xs text-muted-foreground">— {e.label} {e.type === 'VIRTUAL' && `— ${e.placementKey}`}</span>}
                            </div>
                            <div className="mt-1 text-xs text-muted-foreground">
                                {e.claimedBy
                                    ? <>Zebrał(a): <b>{e.claimedBy.name}</b>{e.claimedAt && <> — {new Date(e.claimedAt).toLocaleString()}</>}</>
                                    : <>Nieodebrane</>}
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <Button asChild variant="secondary">
                                <Link href={`/easter-egg/${e.code}`}>Otwórz</Link>
                            </Button>
                            {!e.active && (
                                <Button
                                    onClick={() => reactivateMut.mutate(e.id)}
                                    disabled={reactivateMut.isPending}
                                >
                                    Przywróć
                                </Button>
                            )}
                        </div>
                    </li>
                ))}

                {filtered.length === 0 && !isLoading && (
                    <li className="p-4 text-sm text-muted-foreground">Brak wyników dla wybranych filtrów.</li>
                )}
            </ul>
        </div>
    )
}
