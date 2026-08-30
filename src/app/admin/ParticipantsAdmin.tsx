'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import {CustomLoader} from "@/components/ui/CustomLoader";
import {fetchParticipants} from '@/hooks/queries'
import {apiDelete, apiPost} from '@/lib/api-client'

type Participant = {
    id: string
    name: string
    avatarUrl: string | null
    balance: number
}


const upsertParticipant = (data: Partial<Participant>) => apiPost('/api/participants', data)

const removeParticipant = (id: string) => apiDelete(`/api/participants/${id}`)

export default function ParticipantsAdmin() {
    const qc = useQueryClient()
    const { data: participants = [], isLoading } = useQuery({
        queryKey: ['participants'],
        queryFn: fetchParticipants,
    })

    const save = useMutation({
        mutationFn: upsertParticipant,
        onSuccess: () => qc.invalidateQueries({ queryKey: ['participants'] }),
    })

    const del = useMutation({
        mutationFn: removeParticipant,
        onSuccess: () => qc.invalidateQueries({ queryKey: ['participants'] }),
    })

    if (isLoading) return <CustomLoader/>

    return (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="mb-4">
                <AddEditDialog onSave={(d) => save.mutate(d)} />
            </div>

            <ul className="divide-y divide-white/10">
                {participants.map((p) => (
                    <li key={p.id} className="flex items-center justify-between py-3">
                        <div className="min-w-0">
                            <div className="font-medium truncate">{p.name}</div>
                            {p.avatarUrl && (
                                <div className="text-sm text-white/60 truncate">{p.avatarUrl}</div>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            <AddEditDialog
                                participant={p}
                                onSave={(d) => save.mutate({ id: p.id, ...d })}
                            />
                            <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => del.mutate(p.id)}
                            >
                                Usuń
                            </Button>
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    )
}

function AddEditDialog({
                           participant,
                           onSave,
                       }: {
    participant?: Participant
    onSave: (d: Partial<Participant>) => void
}) {
    const [open, setOpen] = useState(false)
    const [name, setName] = useState(participant?.name ?? '')
    const [avatarUrl, setAvatarUrl] = useState(participant?.avatarUrl ?? '')

    function onOpenChange(v: boolean) {
        setOpen(v)
        if (!v && !participant) {
            setName('')
            setAvatarUrl('')
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogTrigger asChild>
                <Button size="sm" variant={participant ? 'secondary' : 'default'}>
                    {participant ? 'Edytuj' : 'Dodaj'}
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>
                        {participant ? 'Edytuj uczestnika' : 'Dodaj uczestnika'}
                    </DialogTitle>
                </DialogHeader>
                <div className="flex flex-col gap-3">
                    <Input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Imię"
                    />
                    <Input
                        value={avatarUrl}
                        onChange={(e) => setAvatarUrl(e.target.value)}
                        placeholder="URL avatara (opcjonalnie)"
                    />
                    <Button
                        onClick={() => {
                            onSave({ name, avatarUrl: avatarUrl || null })
                            setOpen(false)
                        }}
                    >
                        Zapisz
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
