'use client'

import Image from 'next/image'
import {Crown} from 'lucide-react'
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

export function Podium({top3, onSubmit,}: {
    top3: Participant[]
    onSubmit: (payload: { id: string; amount: number; reason: string }) => void
}) {
    const [first, second, third] = [top3[0], top3[1], top3[2]].filter(Boolean)

    return (
        <div className="w-full">
            {/* Desktop/tablet: schodki */}
            <div className="flex items-end justify-center gap-6">
                {second && <PodiumColumn place={2} p={second} onSubmit={onSubmit} heightClass="h-32"/>}
                {first && <PodiumColumn place={1} p={first} onSubmit={onSubmit} heightClass="h-36" highlight/>}
                {third && <PodiumColumn place={3} p={third} onSubmit={onSubmit} heightClass="h-30"/>}
            </div>

        </div>
    )
}

function PodiumColumn({
                          place,
                          p,
                          onSubmit,
                          heightClass,
                          highlight = false,
                      }: {
    place: 1 | 2 | 3
    p: Participant
    onSubmit: (payload: { id: string; amount: number; reason: string }) => void
    heightClass: string
    highlight?: boolean
}) {
    const podiumImg =
        place === 1
            ? 'bg-[url(/images/podium/1st.png)]'
            : place === 2
                ? 'bg-[url(/images/podium/2nd.png)]'
                : 'bg-[url(/images/podium/3rd.png)]'

    return (
        <div className="flex flex-col items-center">
            <div className="relative -mb-6 z-20">
                <Image
                    src={p.avatarUrl ?? '/images/participants/default.png'}
                    alt={p.name}
                    width={place === 1 ? 150 : place === 2 ? 140 : 130}
                    height={place === 1 ? 150 : place === 2 ? 140 : 130}
                    className="max-w-[150px]"
                />
                <Image
                    src={place === 1 ? '/images/podium/1st-medal.png' : place === 2 ? '/images/podium/2nd-medal.png' : '/images/podium/3rd-medal.png'}
                    alt={p.name}
                    width={25}
                    height={31}
                    className="absolute bottom-3 right-1" aria-hidden="true"
                />
            </div>

            <div
                className={`relative ${heightClass} w-40 rounded-xl ${podiumImg} bg-center bg-contain bg-no-repeat flex flex-col items-center p-3 pt-7`}
            >
                <div className="flex flex-col gap-2 items-center">
                    <h3 className="text-xl font-bold">{p.name}</h3>
                    <div className="bg-black/40 font-bold rounded-md text-center w-[100px]">{p.balance}</div>
                </div>

                <div className="absolute bottom-2 -right-2">
                    <AddPointsDialog participantId={p.id} onSubmit={onSubmit}/>
                </div>
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
                <Button size="sm" variant="secondary">+</Button>
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
