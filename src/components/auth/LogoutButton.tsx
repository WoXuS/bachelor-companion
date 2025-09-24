'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { LogOut } from 'lucide-react'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'

export default function LogoutButton() {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const router = useRouter()

    const logout = async () => {
        try {
            setLoading(true)
            const res = await fetch('/api/auth/logout', { method: 'POST' })
            if (!res.ok) throw new Error('Failed to log out')
            setOpen(false)
            router.refresh()
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button
                    variant="link"
                    size="icon"
                    className="text-destructive py-3 px-1 flex-1 flex justify-center"
                >
                    <LogOut size={24} />
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Czy na pewno wylogować?</DialogTitle>
                </DialogHeader>
                <div className="flex flex-col gap-3">
                    <Button onClick={logout} variant="destructive" disabled={loading}>
                        Tak
                    </Button>
                    <Button onClick={() => setOpen(false)} disabled={loading}>
                        Nie
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
