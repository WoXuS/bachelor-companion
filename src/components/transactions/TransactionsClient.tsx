'use client'

import {useQuery, useMutation, useQueryClient} from '@tanstack/react-query'
import {redirect, useRouter} from 'next/navigation'
import {useEffect, useState} from 'react'
import {Button} from '@/components/ui/button'
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectTrigger,
    SelectValue
} from '@/components/ui/select'
import {toast} from 'sonner'
import {getAdmin} from '@/hooks/useAdmin'
import {TransactionDto} from "@/types/transaction";
import {ParticipantDto} from "@/types/participant";
import {CustomLoader} from "@/components/ui/CustomLoader";
import {Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger} from '@/components/ui/dialog'
import {Input} from '@/components/ui/input'
import {RefreshCw, Trash2} from "lucide-react"
import {errMsg} from "@/lib/errors";
import {fetchParticipants} from '@/hooks/queries'
import {apiDelete, apiGet, apiPost} from '@/lib/api-client'

function fetchTransactions(participantId?: string, order: 'asc' | 'desc' = 'desc') {
    const query = new URLSearchParams({order})
    if (participantId) query.set('participantId', participantId)
    return apiGet<TransactionDto[]>(`/api/transactions?${query}`)
}

const revertTransaction = (id: string) => apiPost(`/api/transactions/${id}/revert`)

const deleteTransaction = (transactionId: string) => apiDelete(`/api/transactions/${transactionId}`)


export default function TransactionsClient({
                                               participantId,
                                               initialOrder = 'desc',
                                           }: {
    participantId?: string
    initialOrder?: 'asc' | 'desc'
}) {
    const qc = useQueryClient()
    const router = useRouter()
    const [order, setOrder] = useState<'asc' | 'desc'>(initialOrder)
    const {data: me} = useQuery({queryKey: ['me'], queryFn: getAdmin})
    const isAdmin = !!me?.isAdmin
    const [selected, setSelected] = useState<string>('')

    const {data: txs = [], isLoading} = useQuery({
        queryKey: ['transactions', participantId, order],
        queryFn: () => fetchTransactions(participantId, order),
    })
    const {data: participants = []} = useQuery({
        queryKey: ['participants'],
        queryFn: fetchParticipants,
    })

    const revertMut = useMutation({
        mutationFn: revertTransaction,
        onSuccess: () => {
            toast.success('Transakcja cofnięta')
            qc.invalidateQueries({queryKey: ['transactions']})
            qc.invalidateQueries({queryKey: ['participants']})
            qc.invalidateQueries({queryKey: ['ranking']})
        },
        onError: (e) => toast.error(errMsg(e)),
    })

    const deleteMut = useMutation({
        mutationFn: deleteTransaction,
        onSuccess: () => {
            toast.success('Usunięto transakcję.')
            qc.invalidateQueries({queryKey: ['transactions']})
            qc.invalidateQueries({queryKey: ['participants']})
            qc.invalidateQueries({queryKey: ['ranking']})
        },
        onError: (e) => toast.error(errMsg(e)),
    })
    useEffect(() => {
        setSelected(participantId ?? '')
    }, [participantId])

    if (isLoading) return <CustomLoader/>
    return (
        <div className="max-w-3xl mx-auto p-6 pt-20 flex flex-col gap-6">
            <h1 className="text-2xl font-bold">Historia punktów</h1>

            <div className="flex gap-2 flex-wrap">
                <Select
                    value={order}
                    onValueChange={(v) => setOrder(v as 'asc' | 'desc')}
                >
                    <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Sortowanie"/>
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="desc">Od najnowszych</SelectItem>
                        <SelectItem value="asc">Od najstarszych</SelectItem>
                    </SelectContent>
                </Select>
                <Select onValueChange={(p) => {
                    setSelected(p)
                    router.push(p ? `/transactions/${p}` : '/transactions')
                }} value={selected}>
                    <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Wybierz uczestnika"/>
                    </SelectTrigger>
                    <SelectContent>
                        <SelectGroup>
                            <SelectLabel>Uczestnicy</SelectLabel>
                            {participants.map((p) => (
                                <SelectItem key={p.id} value={p.id}>
                                    {p.name}
                                </SelectItem>
                            ))}
                        </SelectGroup>
                    </SelectContent>
                </Select>
                {participantId && (
                    <Button className="flex-1" onClick={() => {
                        setSelected('');
                        redirect('/transactions')
                    }}>
                        Pokaż wszystko
                    </Button>
                )}
                {isAdmin && <NewTransferDialog participants={participants}/>}
            </div>

            <ul className="divide-y divide-white/10">
                {txs.length ? txs.map((t) => {
                    const predicted = t.participant.balance - t.amount
                    const wouldBeNegative = predicted < 0
                    const isRevert = t.reason.includes('REVERT')
                    return (
                        <li key={t.id} className="flex justify-between items-stretch py-3">
                            <div className="flex flex-col gap-2">
                                <div className="font-medium">{t.reason}</div>
                                <div className="text-sm text-gray-400">
                                    <div>
                                        {new Date(t.createdAt).toLocaleString()} —{' '}
                                        <Button
                                            variant="link"
                                            size="sm"
                                            onClick={() => router.push(`/transactions/${t.participant.id}`)}
                                            className="p-0 text-primary"
                                        >
                                            {t.participant.name}
                                        </Button>
                                    </div>
                                    {t.counterparty && (
                                        t.amount > 0 ? (
                                            // otrzymujący
                                            <p className="text-xs">
                                                <span className="text-green-400">{t.participant.name}</span> ← <span
                                                className="text-red-400">{t.counterparty.name} </span>
                                            </p>
                                        ) : (
                                            // wysyłający
                                            <p className="text-xs">
                                                <span className="text-red-400">{t.participant.name}</span> → <span
                                                className="text-green-400">{t.counterparty.name} </span>
                                            </p>
                                        )
                                    )}
                                </div>
                                <div
                                    className={`font-semibold ${t.amount > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                    {t.amount > 0 ? '+' : ''}{t.amount}
                                    <span
                                        className="font-medium text-sm"> $pruch </span>{t.isDoubled && <span
                                    className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-1 text-[10px] font-semibold text-emerald-300">×2</span>}
                                    {typeof t.balanceAfter === 'number' && (
                                        <span
                                            className="ml-2 text-xs text-gray-400 font-medium">→ saldo po: {t.balanceAfter} $pruch</span>
                                    )}
                                </div>
                            </div>
                            {isAdmin && (
                                <div className="flex items-stretch">
                                    {!isRevert && (<Button
                                        variant={`${wouldBeNegative ? 'outline' : 'secondary'}`}
                                        size="sm"
                                        className={`h-full rounded-none ${wouldBeNegative && 'opacity-40'}`}
                                        onClick={() =>
                                            wouldBeNegative
                                                ? toast.error('Cofnięcie obniżyłoby saldo poniżej zera')
                                                : revertMut.mutate(t.id)
                                        }
                                        title={wouldBeNegative ? 'Cofnięcie obniżyłoby saldo poniżej zera' : 'Cofnij transakcję'}
                                    >
                                        <RefreshCw className={`${revertMut.isPending ? 'animate-spin' : ''}`}/>
                                    </Button>)}
                                    <Button
                                        variant={`${wouldBeNegative ? 'outline' : 'destructive'}`}
                                        size="sm"
                                        className={`h-full ${!isRevert ? 'rounded-none rounded-e-lg' : ''} ${wouldBeNegative && 'opacity-40'}`}
                                        onClick={() =>
                                            wouldBeNegative
                                                ? toast.error('Usunięcie obniżyłoby saldo poniżej zera')
                                                : deleteMut.mutate(t.id)
                                        }
                                        title={wouldBeNegative ? 'Usunięcie obniżyłoby saldo poniżej zera' : 'Usuń transakcję'}
                                    >
                                        <Trash2 className={`${deleteMut.isPending ? 'animate-bounce' : ''}`}/>
                                    </Button>
                                </div>
                            )}
                        </li>)
                }) : <div className="text-destructive">Brak transakcji.</div>}

            </ul>
        </div>
    )
}

const transferFetch = (data: {fromId: string; toId: string; amount: number; reason: string}) =>
    apiPost('/api/transactions/transfer', data)

function NewTransferDialog({participants}: { participants: ParticipantDto[] }) {
    const [open, setOpen] = useState(false)
    const [fromId, setFromId] = useState<string>()
    const [toId, setToId] = useState<string>()
    const [amount, setAmount] = useState<number>(0)
    const [reason, setReason] = useState('')
    const qc = useQueryClient()
    const transferMut = useMutation({
        mutationFn: transferFetch,
        onSuccess: () => {
            toast.success('Transfer wykonany')
            qc.invalidateQueries({queryKey: ['transactions']})
            qc.invalidateQueries({queryKey: ['participants']})
            qc.invalidateQueries({queryKey: ['ranking']})
        },
        onError: (e) => toast.error(errMsg(e)),
    })
    const from = participants.find(p => p.id === fromId)
    const to = participants.find(p => p.id === toId)
    const newFrom = from ? from.balance - amount : null
    const newTo = to ? to.balance + amount : null
    const valid = !!fromId && !!toId && !!reason && amount > 0 && newFrom !== null && newFrom >= 0

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="flex-1" variant="secondary">+ Nowa transakcja</Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader><DialogTitle>Wymiana $pruch Dollarów</DialogTitle></DialogHeader>
                <div className="flex flex-col gap-3">
                    <Select onValueChange={setFromId}>
                        <SelectTrigger><SelectValue placeholder="Od kogo"/></SelectTrigger>
                        <SelectContent>
                            {participants.map(p => (
                                <SelectItem key={p.id} value={p.id}>
                                    {p.name} (saldo: {p.balance})
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select onValueChange={setToId}>
                        <SelectTrigger><SelectValue placeholder="Dla kogo"/></SelectTrigger>
                        <SelectContent>
                            {participants.map(p => (
                                <SelectItem key={p.id} value={p.id}>
                                    {p.name} (saldo: {p.balance})
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Input
                        type="number"
                        value={amount || ''}
                        onChange={(e) => setAmount(Number(e.target.value))}
                        placeholder="Kwota"
                    />
                    <Input
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="Powód"
                    />

                    {from && typeof newFrom === 'number' && (
                        <p className={`text-sm ${newFrom < 0 ? 'text-red-400' : 'text-green-400'}`}>
                            {from.name} po transakcji: {newFrom}
                        </p>
                    )}
                    {to && typeof newTo === 'number' && (
                        <p className="text-sm text-green-400">
                            {to.name} po transakcji: {newTo}
                        </p>
                    )}

                    <Button
                        disabled={!valid || transferMut.isPending}
                        onClick={() => {
                            transferMut.mutate(
                                {fromId: fromId!, toId: toId!, amount, reason},
                                {onSuccess: () => setOpen(false)}
                            )
                        }}
                    >
                        Zatwierdź
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
