'use client'
import {Podium} from '@/components/ranking/Podium'
import {useQuery, useMutation, useQueryClient} from '@tanstack/react-query'
import Image from 'next/image'
import {Button} from '@/components/ui/button'
import {Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger} from '@/components/ui/dialog'
import {Input} from '@/components/ui/input'
import {useState} from 'react'
import {CustomLoader} from '@/components/ui/CustomLoader'
import {ParticipantDto} from "@/types/participant";
import {getAdmin} from "@/hooks/useAdmin";
import {Receipt} from "lucide-react";
import {toast} from "sonner";
import VirtualEggButton from "@/components/easter-egg/VirtualEggButton";
import {apiGet, apiPost} from '@/lib/api-client'

const fetchRanking = () => apiGet<ParticipantDto[]>('/api/ranking')

const addTransaction = (id: string, amount: number, reason: string) =>
    apiPost(`/api/participants/${id}/transactions`, {amount, reason})

export default function RankingPage() {
    const queryClient = useQueryClient()
    const {data: ranking = [], isLoading, isError} = useQuery({queryKey: ['ranking'], queryFn: fetchRanking})

    const {data} = useQuery({queryKey: ['me'], queryFn: getAdmin})
    const isAdmin = !!data?.isAdmin

    const mutation = useMutation({
        mutationFn: ({id, amount, reason}: { id: string; amount: number; reason: string }) =>
            addTransaction(id, amount, reason),
        onSuccess: () => {
            toast.success('Pomyślnie edytowane punkty.')
            queryClient.invalidateQueries({queryKey: ['ranking']})
        },
        onError: (e) => {
            toast.error(e.message)
        }
    })

    const podium = ranking.slice(0, 3)
    const rest = ranking.slice(3)


    if (isLoading) return <CustomLoader/>
    if (isError) return <p>Coś poszło nie tak</p>
    return (
        <div className="max-w-2xl mx-auto p-4 flex flex-col gap-4 pt-20">
            <h1 className="text-3xl font-bold text-center mb-6">Ranking</h1>

            <Podium
                top3={podium}
                onSubmitAction={({id, amount, reason}) =>
                    mutation.mutate({id, amount, reason})
                }
                isAdmin={isAdmin}
            />

            <ul className="flex flex-col gap-3">
                {rest.map((p, idx) => (
                    <li
                        key={p.id}
                        className="flex items-center justify-between rounded-md shadow-sm bg-gradient-to-br from-slate-900/60 to-slate-900/30"
                    >
                        <div className="flex items-center gap-2 relative">
                            <p className="bg-primary-foreground rounded-e-4xl rounded-s-[9%] py-3 w-10 sm:w-15 h-[76px] flex items-center justify-center">{idx + 4}</p>

                            <Image
                                src={p.avatarUrl ?? '/images/participants/default.png'}
                                alt={p.name}
                                width={60}
                                height={60}
                                className="rounded-full py-2 "
                            />
                            {idx === rest.length - 1 &&
                                <VirtualEggButton placementKey="ranking-last"
                                                  className="absolute right-[40%] top-[50%] transform-[translate(-50%,-50%)] z-20 opacity-25"/>
                            }
                            <p className="flex flex-col gap-0.5">
                                <span className="font-medium">{p.name}</span>
                                {p.buffs?.map(buff => (
                                    buff.type === "DOUBLE_POINTS" && buff.remainingMatches > 0 &&
                                    <span key={buff.id}
                                          className="w-fit rounded-full border border-emerald-500/40 bg-emerald-500/60 px-1.5 text-[10px] font-semibold text-emerald-300">
                                        Punkty x2 ({buff.remainingMatches})
                                    </span>
                                ))}
                            </p>


                        </div>
                        <div className="flex items-center gap-2 pr-3">
                            <div
                                className={`bg-primary-foreground/70 rounded-md px-3  ${p.balance > 999 ? 'text-sm py-2' : 'text-md py-1'} font-bold flex gap-[5px] items-center`}>
                                <p>{p.balance}</p>
                                <Receipt size="20"/>
                            </div>
                            {isAdmin &&
                                <AddPointsDialog participantId={p.id} mutate={mutation.mutate}/>
                            }
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
    const [open, setOpen] = useState(false)

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="sm" variant="destructive">
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
                            setOpen(false)
                        }}
                    >
                        Submit
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
