'use client'
import {Button} from '@/components/ui/button'
import {LogOut} from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import {useState} from 'react'
import {useRouter, usePathname} from "next/navigation";

export default function LogoutButton() {
    const [open, setOpen] = useState(false)
    const router = useRouter()
    const pathname = usePathname()

    const logout = async () => {
        const res = await fetch('/api/auth/logout', {method: "POST", headers: {'Content-Type': 'application/json'}})
        if (!res.ok) throw new Error('Failed to log out')
        setOpen(false);
        router.replace(pathname)
    }

    return (

        <Dialog open={open} onOpenChange={() => setOpen(!open)}>
            <DialogTrigger asChild className="fixed bottom-2 right-2">
                <Button variant="destructive" size="sm">
                    <LogOut/>
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>
                        Czy na pewno wylogować?
                    </DialogTitle>
                </DialogHeader>
                <div className="flex flex-col gap-3">
                    <Button onClick={() => logout()} variant="destructive">
                        Tak
                    </Button>
                    <Button onClick={() => setOpen(false)}>
                        Nie
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}