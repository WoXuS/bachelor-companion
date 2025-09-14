'use client'

import Image from 'next/image'
import {Button} from '@/components/ui/button'
import {Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger} from '@/components/ui/dialog'
import {Input} from '@/components/ui/input'
import {useState} from 'react'
import { Receipt } from 'lucide-react';

type Participant = {
    id: string
    name: string
    balance: number
    avatarUrl: string | null
}

export function Podium({top3, onSubmit, isAdmin}: {
    top3: Participant[]
    onSubmit: (payload: { id: string; amount: number; reason: string }) => void
    isAdmin: boolean
}) {
    const [first, second, third] = [top3[0], top3[1], top3[2]].filter(Boolean)

    return (
        <div className="w-full">
            <div className="flex items-end justify-center gap-2">
                {second && <PodiumColumn place={2} p={second} onSubmit={onSubmit} heightClass="mb-2" isAdmin={isAdmin}/>}
                {first && <PodiumColumn place={1} p={first} onSubmit={onSubmit} heightClass="mb-5" isAdmin={isAdmin}/>}
                {third && <PodiumColumn place={3} p={third} onSubmit={onSubmit} isAdmin={isAdmin}/>}
            </div>

        </div>
    )
}

function PodiumColumn({
                          place,
                          p,
                          onSubmit,
                          heightClass,
                          isAdmin
                      }: {
    place: 1 | 2 | 3
    p: Participant
    onSubmit: (payload: { id: string; amount: number; reason: string }) => void
    heightClass?: string
    isAdmin: boolean
}) {
    const podiumImg =
        place === 1
            ? 'bg-[url(/images/podium/1st.png)]'
            : place === 2
                ? 'bg-[url(/images/podium/2nd.png)]'
                : 'bg-[url(/images/podium/3rd.png)]'

    return (
        <div className="flex flex-col items-center flex-1">
            <div className="relative max-w-[150px]">
                <Image
                    src={p.avatarUrl ?? '/images/participants/default.png'}
                    alt={p.name}
                    width={512}
                    height={512}
                    className="w-full"
                />
                <Image
                    src={place === 1 ? '/images/podium/1st-medal.png' : place === 2 ? '/images/podium/2nd-medal.png' : '/images/podium/3rd-medal.png'}
                    alt={p.name}
                    width={100}
                    height={124}
                    className="absolute bottom-0 right-1 max-w-[25px]" aria-hidden="true"
                />
            </div>

            <div
                className={`relative ${heightClass} h-[clamp(92px,22vw,128px)] max-w-50 w-full rounded-xl ${podiumImg} bg-top bg-contain bg-no-repeat flex flex-col items-center p-3 pt-4 sm:pt-5`}
            >
                <div className="flex flex-col gap-2 items-center sm:w-[50%] w-[65%]">
                    <h3 className="text-md sm:text-xl font-bold whitespace-nowrap">{p.name}</h3>
                    <div
                        className="bg-primary-foreground/70 font-bold rounded-md px-5 sm:px-4 text-md sm:text-xl flex items-center justify-center gap-[3px]">
                        <Receipt size="16"/>
                        {p.balance}
                    </div>
                </div>
                {isAdmin && (
                    <div className="absolute right-[50%] transform-[translateX(50%)] -bottom-3">
                        <AddPointsDialog participantId={p.id} onSubmit={onSubmit}/>
                    </div>)
                }
            </div>
        </div>
    )
}

function AddPointsDialog({
                             participantId,
                             onSubmit,
                         }: {
    participantId: string
    onSubmit: (payload: { id: string; amount: number; reason: string }) => void
}) {
    const [amount, setAmount] = useState(1)
    const [reason, setReason] = useState('')

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button size="sm" variant="destructive">+</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
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
                        <Button type="button" onClick={() => setAmount((a) => a + 1)}>+1</Button>
                        <Button type="button" onClick={() => setAmount((a) => a - 1)}>-1</Button>
                    </div>
                    <Input
                        type="text"
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="Powód"
                    />
                    <Button
                        onClick={() => {
                            onSubmit({id: participantId, amount, reason: reason || 'Brak powodu'})
                        }}
                    >
                        Submit
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
