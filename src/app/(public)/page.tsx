'use client'

import { useQuery, useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {getAdmin} from "@/hooks/useAdmin";

type ShopItem = {
    id: string
    label: string
    cost: number
    category: string
}

type Participant = {
    id: string
    name: string
}

async function fetchShop(): Promise<ShopItem[]> {
    const res = await fetch('/api/shop')
    if (!res.ok) throw new Error('Failed to load shop')
    return res.json()
}

async function fetchParticipants(): Promise<Participant[]> {
    const res = await fetch('/api/participants')
    if (!res.ok) throw new Error('Failed to load participants')
    return res.json()
}

async function purchase(participantId: string, itemId: string) {
    const res = await fetch('/api/shop/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participantId, itemId }),
    })
    if (!res.ok) throw new Error('Purchase failed')
    return res.json()
}

export default function HomePage() {
    const {data} = useQuery({queryKey: ['me'], queryFn: getAdmin})
    const isAdmin = !!data?.isAdmin
    const { data: items = [] } = useQuery({ queryKey: ['shop'], queryFn: fetchShop })
    const { data: participants = [] } = useQuery({
        queryKey: ['participants'],
        queryFn: fetchParticipants,
        enabled: isAdmin,
    })

    const mutation = useMutation({
        mutationFn: ({ participantId, itemId }: { participantId: string; itemId: string }) =>
            purchase(participantId, itemId),
    })

    return (
        <div className="max-w-2xl mx-auto p-6 space-y-6">
            <h1 className="text-2xl font-bold mb-4">Cennik</h1>
            <ul className="space-y-3">
                {items.map((item) => (
                    <li
                        key={item.id}
                        className="flex items-center justify-between border rounded-lg p-3 bg-white/5"
                    >
                        <div>
                            <div className="font-medium">{item.label}</div>
                            <div className="text-sm text-gray-400">{item.cost} $pruch</div>
                        </div>
                        {isAdmin && (
                            <PurchaseDialog
                                item={item}
                                participants={participants}
                                onPurchase={(pid) => mutation.mutate({ participantId: pid, itemId: item.id })}
                            />
                        )}
                    </li>
                ))}
            </ul>
        </div>
    )
}

function PurchaseDialog({
                            item,
                            participants,
                            onPurchase,
                        }: {
    item: ShopItem
    participants: Participant[]
    onPurchase: (participantId: string) => void
}) {
    const [selected, setSelected] = useState<string | null>(null)

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button size="sm">Kup</Button>
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
                            <SelectValue placeholder="Wybierz uczestnika" />
                        </SelectTrigger>
                        <SelectContent>
                            {participants.map((p) => (
                                <SelectItem key={p.id} value={p.id}>
                                    {p.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Button
                        onClick={() => {
                            if (selected) onPurchase(selected)
                        }}
                    >
                        Potwierdź zakup
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
