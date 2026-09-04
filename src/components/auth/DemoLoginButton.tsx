'use client'

import * as React from 'react'
import {useRouter} from 'next/navigation'
import {Button} from '@/components/ui/button'
import {apiPost} from '@/lib/api-client'
import {errMsg} from '@/lib/errors'

export default function DemoLoginButton() {
    const router = useRouter()
    const [loading, setLoading] = React.useState(false)
    const [error, setError] = React.useState<string | null>(null)

    const enter = async () => {
        setLoading(true)
        setError(null)
        try {
            await apiPost('/api/auth/demo-login')
            router.replace('/admin')
            router.refresh()
        } catch (e) {
            setError(errMsg(e))
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="space-y-2">
            <div className="flex items-center gap-3 text-xs text-white/50">
                <span className="h-px flex-1 bg-white/15"/>
                albo
                <span className="h-px flex-1 bg-white/15"/>
            </div>
            <Button onClick={enter} disabled={loading} variant="secondary" className="w-full font-semibold">
                {loading ? 'Wchodzę…' : 'Wejdź jako admin (demo)'}
            </Button>
            <p className="text-center text-xs text-white/50">
                Bez hasła. Dane są fikcyjne i regularnie resetowane.
            </p>
            {error && <p className="text-sm text-red-400">{error}</p>}
        </div>
    )
}
