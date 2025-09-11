'use client'
import {Podium} from '@/components/ranking/Podium'
import {useQuery, useMutation, useQueryClient} from '@tanstack/react-query'
import Image from 'next/image'
import {Button} from '@/components/ui/button'
import {Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger} from '@/components/ui/dialog'
import {Input} from '@/components/ui/input'
import {useState} from 'react'
import {Loader} from '@/components/ui/Loader'
import {ParticipantDto} from "@/types/participant";
import {getAdmin} from "@/hooks/useAdmin";
import {Receipt} from "lucide-react";

async function fetchRanking(): Promise<ParticipantDto[]> {
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
    const {data: ranking = [], isLoading, isError} = useQuery({queryKey: ['ranking'], queryFn: fetchRanking})

    const {data} = useQuery({queryKey: ['me'], queryFn: getAdmin})
    const isAdmin = !!data?.isAdmin

    const [isOpen, setIsOpen] = useState(false);

    const mutation = useMutation({
        mutationFn: ({id, amount, reason}: { id: string; amount: number; reason: string }) =>
            addTransaction(id, amount, reason),
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: ['ranking']})
            setIsOpen(false)
        },
    })

    const podium = ranking.slice(0, 3)
    const rest = ranking.slice(3)


    if (isLoading) return <Loader/>
    if (isError) return <p>Coś poszło nie tak</p>

    return (
        <div className="max-w-2xl mx-auto p-4 flex flex-col gap-4">
            <h1 className="text-3xl font-bold text-center mb-6">Ranking</h1>

            <Podium
                top3={podium}
                onSubmit={({id, amount, reason}) =>
                    mutation.mutate({id, amount, reason})
                }
                isAdmin={isAdmin}
            />

            <ul className="p-3 rounded-lg bg-foreground flex flex-col gap-3">
                {rest.map((p, idx) => (
                    <li
                        key={p.id}
                        className="flex items-center justify-between rounded-md shadow-sm bg-primary"
                    >
                        <div className="flex items-center gap-2">
                            <p className="bg-primary-foreground rounded-e-4xl rounded-s-[10%] py-3 w-15 h-[76px] flex items-center justify-center">{idx + 4}</p>
                            <Image
                                src={p.avatarUrl ?? '/images/participants/default.png'}
                                alt={p.name}
                                width={60}
                                height={60}
                                className="rounded-full py-2"
                            />
                            <span className="font-medium">{p.name}</span>
                        </div>
                        <div className="flex items-center gap-2 pr-3">
                            <div className="bg-primary-foreground/70 rounded-md px-5 sm:px-3 text-lg font-bold flex items-center justify-center gap-[3px]">
                                <Receipt size="24"/>
                                <p>{p.balance}</p>
                            </div>
                            {isAdmin && (
                                <AddPointsDialog participantId={p.id} mutate={mutation.mutate} isOpen={isOpen} setIsOpen={()=> setIsOpen(true)}/>
                            )}
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
                             isOpen,
    setIsOpen
                         }: {
    participantId: string
    mutate: (input: { id: string; amount: number; reason: string }) => void
    isOpen:boolean
    setIsOpen: () => void
}) {
    const [amount, setAmount] = useState(1)
    const [reason, setReason] = useState('')

    return (
        <Dialog open={isOpen}>
            <DialogTrigger asChild>
                <Button size="sm" variant="destructive" onClick={()=> setIsOpen()}>
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
