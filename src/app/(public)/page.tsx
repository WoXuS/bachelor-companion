'use client'

import {useQuery, useMutation, useQueryClient} from '@tanstack/react-query'
import React, {useEffect, useMemo, useState} from 'react'
import {Button} from '@/components/ui/button'
import {Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger} from '@/components/ui/dialog'
import {Input} from '@/components/ui/input'
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select'
import {getAdmin} from "@/hooks/useAdmin"
import Link from "next/link"
import {ParticipantDto} from "@/types/participant"
import {ShopItemDto} from "@/types/shop-item"
import {toast} from "sonner"
import {CustomLoader} from "@/components/ui/CustomLoader"
import {Cog} from "lucide-react"

/** ---------- Types & helpers ---------- */

type ShopItemView = ShopItemDto & {
    effectiveCost?: number
}

type ShopConfig = {
    discountsEnabled: boolean
    discountPercent: number
}

function priceState(item: ShopItemView) {
    const effective = item.effectiveCost ?? item.cost
    if (effective < item.cost) return {kind: 'discount' as const, delta: item.cost - effective}
    if (effective > item.cost) return {kind: 'surcharge' as const, delta: effective - item.cost}
    return {kind: 'normal' as const, delta: 0}
}

function prettyDeltaPercent(base: number, effective: number) {
    if (!base) return '0%'
    const pct = Math.round(((effective - base) / base) * 100)
    return (pct > 0 ? `+${pct}%` : `${pct}%`)
}

/** ---------- Data fetching ---------- */

async function fetchShop(): Promise<ShopItemView[]> {
    const res = await fetch('/api/shop', {cache: 'no-store'})
    if (!res.ok) throw new Error('Failed to load shop')
    return res.json()
}

async function fetchParticipants(): Promise<ParticipantDto[]> {
    const res = await fetch('/api/participants', {cache: 'no-store'})
    if (!res.ok) throw new Error('Failed to load participants')
    return res.json()
}

async function purchase(participantId: string, itemId: string) {
    const res = await fetch('/api/shop/purchase', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({participantId, itemId}),
    })
    if (!res.ok) {
        let message = 'Purchase failed'
        try {
            const data = await res.json()
            if (data?.message) message = data.message
        } catch {}
        throw new Error(message)
    }
    return res.json()
}

async function upsertShopItem(data: Partial<ShopItemDto>) {
    const method = data.id ? 'PUT' : 'POST'
    const res = await fetch('/api/shop/manage', {
        method,
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(data),
    })
    if (!res.ok) {
        let message = data.id ? 'Failed to update Shop Item' : 'Failed to create Shop Item'
        try {
            const j = await res.json()
            if (j?.message) message = j.message
        } catch {}
        throw new Error(message)
    }
    return res.json()
}

async function removeShopItem(id: string) {
    const res = await fetch(`/api/shop/manage/${id}`, {method: 'DELETE'})
    if (!res.ok) {
        let message = 'Failed to delete Shop Item'
        try {
            const j = await res.json()
            if (j?.message) message = j.message
        } catch {}
        throw new Error(message)
    }
    return res.json()
}

async function fetchShopConfig(): Promise<ShopConfig> {
    const r = await fetch('/api/shop/config', {cache: 'no-store'})
    if (!r.ok) throw new Error('Failed to load config')
    return r.json()
}

async function updateShopConfig(patch: Partial<ShopConfig>) {
    const r = await fetch('/api/shop/config', {
        method: 'PUT',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(patch),
    })
    if (!r.ok) throw new Error('Failed to update config')
    return r.json()
}

/** ---------- Page ---------- */

export default function HomePage() {
    const {data: me} = useQuery({queryKey: ['me'], queryFn: getAdmin, staleTime: 30_000})
    const isAdmin = !!me?.isAdmin

    const {data: items = [], isLoading} = useQuery({queryKey: ['shop'], queryFn: fetchShop})
    const {data: cfg} = useQuery({queryKey: ['shop-config'], queryFn: fetchShopConfig})

    const {data: participants = []} = useQuery({
        queryKey: ['participants'],
        queryFn: fetchParticipants,
        enabled: isAdmin,
    })

    const qc = useQueryClient()

    const mutation = useMutation({
        mutationFn: ({participantId, itemId}: { participantId: string; itemId: string }) =>
            purchase(participantId, itemId),
        onSuccess: () => {
            toast.success("Zakup pomyślny")
            qc.invalidateQueries({queryKey: ['participants']})
            qc.invalidateQueries({queryKey: ['ranking']})
        },
        onError: (error: any) => toast.error(`Zakup niepomyślny: ${error.message}`),
    })

    const save = useMutation({
        mutationFn: upsertShopItem,
        onSuccess: () => {
            qc.invalidateQueries({queryKey: ['shop']})
            toast.success('Przedmiot zapisany')
        },
        onError: (err: any) => toast.error(`Błąd przy zapisie: ${err.message}`),
    })

    const del = useMutation({
        mutationFn: removeShopItem,
        onSuccess: () => {
            qc.invalidateQueries({queryKey: ['shop']})
            toast.success('Przedmiot usunięty')
        },
        onError: (err: any) => toast.error(`Błąd przy usuwaniu: ${err.message}`),
    })

    const headerBadge = useMemo(() => {
        if (!cfg) return null
        if (!cfg.discountsEnabled) {
            return (
                <span className="inline-flex items-center gap-1 rounded-full border border-slate-600/50 bg-slate-800/50 px-2 py-0.5 text-xs text-slate-300">
          Ceny standardowe
        </span>
            )
        }
        // Pokazuj realny procent w configu (UI nie zgaduje z itemów)
        return (
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-300">
        Obniżka −{cfg.discountPercent}%
      </span>
        )
    }, [cfg])

    if (isLoading) return <CustomLoader/>

    return (
        <div className="mx-auto max-w-2xl space-y-6 p-6 pt-20">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">Cennik</h1>
                {headerBadge}
            </div>

            {isAdmin && <AdminShopControls/>}

            <ul className="space-y-3">
                {items.map((item) => {
                    const effective = item.effectiveCost ?? item.cost
                    const state = priceState(item)
                    const showStriked = effective !== item.cost

                    return (
                        <li
                            key={item.id}
                            className="group flex items-center justify-between rounded-lg border border-slate-700/60 bg-gradient-to-br from-slate-900/60 to-slate-900/30 p-3 shadow-sm transition hover:border-slate-500/50 hover:shadow"
                        >
                            <div className="flex min-w-0 flex-col gap-1">
                                <div className="truncate text-sm font-medium text-slate-100">{item.label}</div>

                                {/* Price line */}
                                <div className="flex items-center gap-2">
                                    {state.kind === 'discount' && (
                                        <>
                      <span className="text-sm font-semibold text-emerald-400">
                        {effective} $pruch
                      </span>
                                            {showStriked && (
                                                <span className="text-xs text-slate-400 line-through">
                          {item.cost} $pruch
                        </span>
                                            )}
                                            <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-300">
                        {prettyDeltaPercent(item.cost, effective)}
                      </span>
                                        </>
                                    )}

                                    {state.kind === 'surcharge' && (
                                        <>
                      <span className="text-sm font-semibold text-rose-400">
                        {effective} $pruch
                      </span>
                                            {showStriked && (
                                                <span className="text-xs text-slate-400 line-through">
                          {item.cost} $pruch
                        </span>
                                            )}
                                            <span className="rounded-full border border-rose-500/40 bg-rose-500/10 px-1.5 py-0.5 text-[10px] font-medium text-rose-300">
                        {prettyDeltaPercent(item.cost, effective)}
                      </span>
                                        </>
                                    )}

                                    {state.kind === 'normal' && (
                                        <span className="text-sm font-semibold text-slate-200">
                      {item.cost} $pruch
                    </span>
                                    )}
                                </div>
                            </div>

                            {isAdmin && (
                                <div className="flex shrink-0 gap-1">
                                    <AddEditItemDialog
                                        onSave={(d) => save.mutate(d)}
                                        shopItem={item}
                                        onDelete={() => del.mutate(item.id)}
                                    />
                                    <PurchaseDialog
                                        item={item}
                                        participants={participants}
                                        onPurchase={(pid) => mutation.mutate({participantId: pid, itemId: item.id})}
                                    />
                                </div>
                            )}
                        </li>
                    )
                })}

                {isAdmin && (
                    <li>
                        <AddEditItemDialog onSave={(d) => save.mutate(d)}/>
                    </li>
                )}
            </ul>

            <section className="space-y-2">
                <h2 className="text-lg font-bold">Jak grać?</h2>
                <p className="text-slate-300">
                    Zbierasz <span className="text-primary">$pruch Dollary</span> wykonując różne czynności.
                    <br/>
                    Możesz wydawać <span className="text-primary">$pruch Dollary</span> na przedmioty z cennika.
                    <br/>
                    Osoby z największą liczbą <span className="text-primary">$pruch Dollarów</span> na koniec wyjazdu
                    wygrywają nagrody.
                </p>
                <h3 className="text-base font-bold">Po co wydawać <span className="text-primary">$pruch Dollary</span>?</h3>
                <p className="text-slate-300">
                    Teoretycznie można kisić Dollary, ale jeśli widzisz, że ktoś tuż za Tobą może wygrać mini-grę,
                    użyj sklepu, żeby to zneutralizować i utrzymać prowadzenie. Sprawdź{' '}
                    <Button asChild variant="link" size="sm" className="h-auto p-0 align-baseline">
                        <Link href="/ranking">ranking</Link>
                    </Button>
                    .
                </p>
            </section>
        </div>
    )
}

/** ---------- Dialogs ---------- */

function PurchaseDialog({
                            item,
                            participants,
                            onPurchase,
                        }: {
    item: ShopItemView
    participants: ParticipantDto[]
    onPurchase: (participantId: string) => void
}) {
    const [open, setOpen] = useState(false)
    const [selected, setSelected] = useState<string | null>(null)

    const effective = item.effectiveCost ?? item.cost
    const chosen = useMemo(
        () => participants.find((p) => p.id === selected) ?? null,
        [participants, selected]
    )
    const newBalance = chosen ? chosen.balance - effective : null
    const canAfford = newBalance !== null && newBalance >= 0

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="sm" variant="secondary">Kup dla</Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Kup dla uczestnika</DialogTitle>
                </DialogHeader>
                <div className="flex flex-col gap-3">
                    <div>
                        <div className="mb-1 font-medium">{item.label}</div>
                        <div className="text-sm text-slate-400">
                            Koszt: <span className="font-semibold text-slate-200">{effective}</span>{' '}
                            {effective !== item.cost && (
                                <span className="ml-1 text-xs text-slate-500 line-through">{item.cost}</span>
                            )} $pruch
                        </div>
                    </div>

                    <Select onValueChange={(v) => setSelected(v)}>
                        <SelectTrigger>
                            <SelectValue placeholder="Wybierz uczestnika"/>
                        </SelectTrigger>
                        <SelectContent>
                            {participants.map((p) => (
                                <SelectItem key={p.id} value={p.id}>
                                    {p.name} (saldo: {p.balance})
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    {chosen && (
                        <p className={`text-sm ${canAfford ? 'text-emerald-400' : 'text-destructive'}`}>
                            Saldo po zakupie: {newBalance}
                        </p>
                    )}

                    <Button
                        disabled={!canAfford || !selected}
                        onClick={() => {
                            if (selected) {
                                onPurchase(selected)
                                setOpen(false)
                            }
                        }}
                    >
                        Potwierdź zakup
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}

function AddEditItemDialog({
                               shopItem,
                               onSave,
                               onDelete
                           }: {
    shopItem?: ShopItemDto
    onSave: (d: Partial<ShopItemDto>) => void
    onDelete?: () => void
}) {
    const [open, setOpen] = useState(false)
    const [key, setKey] = useState((shopItem?.key ?? ''))
    const [label, setLabel] = useState(shopItem?.label ?? '')
    const [cost, setCost] = useState(shopItem?.cost ?? 20)
    const [category, setCategory] = useState(shopItem?.category ?? '')

    function onOpenChange(v: boolean) {
        setOpen(v)
        if (!v && !shopItem) {
            setLabel('')
            setKey('')
            setCost(20)
            setCategory('')
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogTrigger asChild>
                <Button size="sm" variant={shopItem ? 'secondary' : 'default'} className={shopItem ? '' : 'w-full'}>
                    {shopItem ? <Cog/> : '+'}
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>
                        {shopItem ? 'Edytuj przedmiot' : 'Dodaj przedmiot'}
                    </DialogTitle>
                </DialogHeader>
                <div className="flex flex-col gap-3">
                    <Input
                        value={label}
                        onChange={(e) => setLabel(e.target.value)}
                        placeholder="Nazwa"
                    />
                    <Input
                        value={cost}
                        type="number"
                        onChange={(e) => setCost(Number(e.target.value))}
                        placeholder="Koszt"
                    />
                    <Input
                        value={key}
                        onChange={(e) => setKey(e.target.value)}
                        placeholder="Klucz"
                        disabled={!!shopItem?.id}
                    />
                    <Select value={category ?? ''} onValueChange={setCategory}>
                        <SelectTrigger>
                            <SelectValue placeholder="Wybierz kategorię"/>
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value='trolling'>Trolling</SelectItem>
                            <SelectItem value='buff'>Buff</SelectItem>
                            <SelectItem value='immunitet'>Immunitet</SelectItem>
                            <SelectItem value='fun'>Fun</SelectItem>
                        </SelectContent>
                    </Select>
                    <div className="flex gap-2">
                        <Button
                            onClick={() => {
                                onSave({
                                    id: shopItem?.id,
                                    label,
                                    cost: Number(cost) || 0,
                                    key,
                                    category: category || undefined,
                                })
                                setOpen(false)
                            }}
                            className="flex-2"
                        >
                            Zapisz
                        </Button>
                        {onDelete &&
                            <Button
                                onClick={() => {
                                    onDelete()
                                    setOpen(false)
                                }}
                                className="flex-1"
                                variant="destructive"
                            >
                                Usuń
                            </Button>
                        }
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}

/** ---------- Admin Controls ---------- */

function AdminShopControls() {
    const qc = useQueryClient()
    const {data: cfg} = useQuery({queryKey: ['shop-config'], queryFn: fetchShopConfig})
    const [localPercent, setLocalPercent] = useState<number>(20)

    useEffect(() => {
        if (typeof cfg?.discountPercent === 'number') setLocalPercent(cfg.discountPercent)
    }, [cfg?.discountPercent])

    const mutateCfg = useMutation({
        mutationFn: updateShopConfig,
        onSuccess: () => {
            qc.invalidateQueries({queryKey: ['shop-config']})
            qc.invalidateQueries({queryKey: ['shop']})
            toast.success('Zapisano ustawienia sklepu')
        },
        onError: (e: any) => toast.error(e?.message ?? 'Błąd zapisu'),
    })

    const toggle = () => {
        if (!cfg) return
        mutateCfg.mutate({discountsEnabled: !cfg.discountsEnabled})
    }

    const savePercent = () => {
        const val = Math.max(0, Math.min(80, Math.round(localPercent))) // clamp 0..80
        mutateCfg.mutate({discountPercent: val})
    }

    return (
        <div className="rounded-lg border border-slate-700/60 bg-slate-900/50 p-3 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div className="flex items-center gap-2">
                    <Button size="sm" variant={cfg?.discountsEnabled ? 'secondary' : 'default'} onClick={toggle}>
                        {cfg?.discountsEnabled ? 'Wyłącz zniżki' : 'Włącz zniżki'}
                    </Button>
                    <div className="text-xs text-slate-400">
                        Zaokrąglenie cen do najbliższej 20 po stronie serwera
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Input
                        type="number"
                        value={localPercent}
                        onChange={(e) => setLocalPercent(Number(e.target.value))}
                        className="w-24"
                        min={0}
                        max={80}
                        step={5}
                    />
                    <span className="text-sm text-slate-400">% zniżki (0–80)</span>
                    <Button size="sm" onClick={savePercent}>Zapisz %</Button>
                </div>
            </div>
        </div>
    )
}
