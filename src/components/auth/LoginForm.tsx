'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function LoginForm() {
    const router = useRouter()
    const [password, setPassword] = React.useState('')
    const [loading, setLoading] = React.useState(false)
    const [error, setError] = React.useState<string | null>(null)
    const [show, setShow] = React.useState(false)

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault()
        setLoading(true)
        setError(null)
        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password }),
            })
            if (!res.ok) {
                setError('Nieprawidłowe hasło.')
                return
            }
            router.replace('/admin')
            router.refresh()
        } catch {
            setError('Coś poszło nie tak. Spróbuj ponownie.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
                <label className="text-sm text-white/80">Hasło</label>
                <div className="flex gap-2">
                    <Input
                        type={show ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        autoFocus
                        required
                        className="bg-white/10 border-white/20 text-white placeholder-white/40"
                    />
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShow((s) => !s)}
                        className="border-white/30 text-white"
                    >
                        {show ? 'Hide' : 'Show'}
                    </Button>
                </div>
            </div>

            {error && <p className="text-sm text-red-400">{error}</p>}

            <Button
                type="submit"
                disabled={loading}
                className="w-full font-semibold"
            >
                {loading ? 'Logowanie…' : 'Zaloguj'}
            </Button>
        </form>
    )
}
