'use client'

import {useQuery, useMutation, useQueryClient} from '@tanstack/react-query'
import {useState} from 'react'
import {Button} from '@/components/ui/button'
import {Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger} from '@/components/ui/dialog'
import {Input} from '@/components/ui/input'
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select'
import {getAdmin} from "@/hooks/useAdmin";
import Link from "next/link";
import {ParticipantDto} from "@/types/participant";
import {ShopItemDto} from "@/types/shop-item";
import {toast} from "sonner";
import {CustomLoader} from "@/components/ui/CustomLoader";
import {Cog} from "lucide-react";

async function fetchShop(): Promise<ShopItemDto[]> {
    const res = await fetch('/api/shop')
    if (!res.ok) throw new Error('Failed to load shop')
    return res.json()
}

async function fetchParticipants(): Promise<ParticipantDto[]> {
    const res = await fetch('/api/participants')
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
        } catch {
        }
        throw new Error(message)
    }
    return res.json()
}

async function upsertShopItem(data: Partial<ShopItemDto>) {
    if (data.id) {
        const res = await fetch('/api/shop/manage', {
            method: 'PUT',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(data),
        })
        if (!res.ok) {
            let message = 'Failed to update Shop Item'
            try {
                const data = await res.json()
                if (data?.message) message = data.message
            } catch {
            }
            throw new Error(message)
        }
        return res.json()
    } else {
        const res = await fetch('/api/shop/manage', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(data),
        })
        if (!res.ok) {
            let message = 'Failed to create Shop Item'
            try {
                const data = await res.json()
                if (data?.message) message = data.message
            } catch {
            }
            throw new Error(message)
        }
        return res.json()
    }
}

async function removeShopItem(id: string) {
    const res = await fetch(`/api/shop/manage/${id}`, {method: 'DELETE'})
    if (!res.ok) {
        let message = 'Failed to delete Shop Item'
        try {
            const data = await res.json()
            if (data?.message) message = data.message
        } catch {
        }
        throw new Error(message)
    }
    return res.json()
}

export default function HomePage() {
    const {data} = useQuery({queryKey: ['me'], queryFn: getAdmin})
    const isAdmin = !!data?.isAdmin
    const {data: items = [], isLoading} = useQuery({queryKey: ['shop'], queryFn: fetchShop})
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
            toast.success("Zakup pomyślny");
            qc.invalidateQueries({queryKey: ['participants']})
            qc.invalidateQueries({queryKey: ['ranking']})
        },
        onError: (error: any) => {
            toast.error(`Zakup niepomyślny: ${error.message}`);
        }
    })


    const save = useMutation({
        mutationFn: upsertShopItem,
        onSuccess: () => {
            qc.invalidateQueries({queryKey: ['shop']})
            toast.success('Przedmiot zapisany pomyślnie')
        },
        onError: (err: any) => {
            toast.error(`Błąd przy zapisie: ${err.message}`)
        },
    })

    const del = useMutation({
        mutationFn: removeShopItem,
        onSuccess: () => {
            qc.invalidateQueries({queryKey: ['shop']})
            toast.success('Przedmiot usunięty')
        },
        onError: (err: any) => {
            toast.error(`Błąd przy usuwaniu: ${err.message}`)
        },
    })

    if (isLoading) return <CustomLoader/>

    return (
        <div className="max-w-2xl mx-auto p-6 space-y-6 pt-20">
            <h1 className="text-2xl font-bold mb-4">Cennik</h1>
            <ul className="space-y-3">
                {items.map((item) => (
                    <li
                        key={item.id}
                        className="flex items-center justify-between border rounded-lg p-3 bg-white/5"
                    >
                        <div className="flex flex-col gap-2">
                            <div className="font-medium text-sm">{item.label}</div>
                            <div className="text-sm text-gray-400">{item.cost} $pruch</div>
                        </div>
                        {isAdmin && (
                            <div className="flex gap-1">
                                <AddEditItemDialog onSave={(d) => save.mutate(d)} shopItem={item}
                                                   onDelete={() => del.mutate(item.id)}/>
                                <PurchaseDialog
                                    item={item}
                                    participants={participants}
                                    onPurchase={(pid) => {
                                        mutation.mutate({participantId: pid, itemId: item.id})
                                    }}
                                />
                            </div>
                        )}
                    </li>
                ))}
                {isAdmin && (
                    <li>
                        <AddEditItemDialog onSave={(d) => save.mutate(d)}/>
                    </li>
                )}
            </ul>
            <h1 className="text-2xl font-bold mb-4">Jak grać?</h1>
            <p>
                Zbierasz <span className="text-primary">$pruch Dollary</span> wykonując różne czynności.<br/>
                Możesz wydawać <span className="text-primary">$pruch Dollary</span> na przedmioty z cennika.<br/>
                Osoby z największą liczbą <span className="text-primary">$pruch Dollarów</span> na koniec wyjazdu
                wygrywają <Button asChild variant="link" size="icon">
                <Link href="/prizes">nagrody</Link>
            </Button>.
            </p>
            <h1 className="text-lg font-bold mb-4">Po co wydawać <span className="text-primary">$pruch Dollary</span> na
                rzeczy z cennika?</h1>
            <p>
                Teoretycznie można całą gre kisić Dollary i nic nie kupować, ale przyjmijmy taką sytuację:<br/>
                Jesteś na pierwszym miejscu w <Button asChild variant="link" size="icon">
                <Link href="/ranking"> rankingu</Link>
            </Button> i widzisz że zaraz ktoś z drugiego miejsca wygra mini grę i Cię wyprzedzi. Możesz więc zakupić coś
                co mu w tym przeszkodzi i zwiększyć swoje szanse na utrzymanie prowadzenia.
            </p>
        </div>
    )
}

function PurchaseDialog({
                            item,
                            participants,
                            onPurchase,
                        }: {
    item: ShopItemDto
    participants: ParticipantDto[]
    onPurchase: (participantId: string) => void
}) {
    const [open, setOpen] = useState(false)
    const [selected, setSelected] = useState<string | null>(null)

    const chosen = participants.find((p) => p.id === selected)
    const newBalance = chosen ? chosen.balance - item.cost : null
    const canAfford = newBalance !== null && newBalance >= 0

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="sm">Kup dla</Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Kup dla uczestnika</DialogTitle>
                </DialogHeader>
                <div className="flex flex-col gap-3">
                    <div>
                        <div className="mb-1 font-medium">{item.label}</div>
                        <div className="text-sm text-gray-500">Koszt: {item.cost}</div>
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
                        <p className={`text-sm ${canAfford ? 'text-green-400' : 'text-red-400'}`}>
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
    const [cost, setCost] = useState(shopItem?.cost ?? 1)
    const [category, setCategory] = useState(shopItem?.category ?? '')

    function onOpenChange(v: boolean) {
        setOpen(v)
        if (!v && !shopItem) {
            setLabel('')
            setKey('')
            setCost(1)
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
                            <SelectValue placeholder="Wybierz kategorie"/>
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value='trolling'>
                                Trolling
                            </SelectItem>
                            <SelectItem value='immunitet'>
                                Immunitet
                            </SelectItem>
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
