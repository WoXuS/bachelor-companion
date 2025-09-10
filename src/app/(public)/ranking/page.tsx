'use client'
import {Podium} from '@/components/ranking/Podium'
import {useQuery, useMutation, useQueryClient} from '@tanstack/react-query'
import Image from 'next/image'
import {Button} from '@/components/ui/button'
import {Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger} from '@/components/ui/dialog'
import {Input} from '@/components/ui/input'
import {useState} from 'react'

type Participant = {
    id: string
    name: string
    balance: number
    avatarUrl: string | null
}

async function fetchRanking(): Promise<Participant[]> {
    const res = await fetch('/api/ranking')
    if (!res.ok) throw new Error('Failed to fetch ranking')
    return res.json()
}

async function addTransaction(id: string, amount: number, reason: string) {
    const res = await fetch(`/api/participants/${id}/transactions`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({amount, reason}),
    })
    if (!res.ok) throw new Error('Failed to add transaction')
    return res.json()
}

export default function RankingPage() {
    const queryClient = useQueryClient()
    const {data: ranking = []} = useQuery({queryKey: ['ranking'], queryFn: fetchRanking})
    const mutation = useMutation({
        mutationFn: ({id, amount, reason}: { id: string; amount: number; reason: string }) =>
            addTransaction(id, amount, reason),
        onSuccess: () => queryClient.invalidateQueries({queryKey: ['ranking']}),
    })

    const podium = ranking.slice(0, 3)
    const rest = ranking.slice(3)

    return (
        <div className="max-w-2xl mx-auto p-4 flex flex-col gap-4">
            <h1 className="text-3xl font-bold text-center mb-6">Ranking</h1>

            <Podium
                top3={podium}
                onSubmit={({ id, amount, reason }) =>
                    mutation.mutate({ id, amount, reason })
                }
            />

            {/* Reszta */}
            <ul className="p-5 rounded-2xl bg-[#3a1a46] flex flex-col gap-3">
                {rest.map((p, idx) => (
                    <li
                        key={p.id}
                        className="flex items-center justify-between rounded-lg p-3 shadow-sm bg-[#9e4f7f]"
                    >
                        <div className="flex items-center gap-3">
                            <p>{idx+4}</p>
                            <Image
                                src={p.avatarUrl ?? '/images/participants/default.png'}
                                alt={p.name}
                                width={60}
                                height={60}
                                className="rounded-full"
                            />
                            <span className="font-medium">{p.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-lg font-bold">{p.balance}</span>
                            <AddPointsDialog participantId={p.id} mutate={mutation.mutate}/>
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    )
}

function AddPointsDialog({
                             participantId,
                             mutate,
                         }: {
    participantId: string
    mutate: (input: { id: string; amount: number; reason: string }) => void
}) {
    const [amount, setAmount] = useState(1)
    const [reason, setReason] = useState('')

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button size="sm" variant="secondary">
                    +
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Dodaj / odejmij punkty</DialogTitle>
                </DialogHeader>
                <div className="flex flex-col gap-3">
                    <Input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(Number(e.target.value))}
                        placeholder="Ilość punktów"
                    />
                    <div className="flex gap-2">
                        <Button type="button" onClick={() => setAmount((a) => a + 1)}>
                            +1
                        </Button>
                        <Button type="button" onClick={() => setAmount((a) => a - 1)}>
                            -1
                        </Button>
                    </div>
                    <Input
                        type="text"
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="Powód"
                    />
                    <Button
                        onClick={() => {
                            mutate({id: participantId, amount, reason: reason || 'Brak powodu'})
                        }}
                    >
                        Submit
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
