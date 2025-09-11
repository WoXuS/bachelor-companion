import {redirect} from 'next/navigation'
import LoginForm from '@/components/auth/LoginForm'
import {isAdminServer} from '@/lib/session'

export const dynamic = 'force-dynamic'

export default function AdminLoginPage() {
    if (isAdminServer()) {
        redirect('/admin')
    }

    return (
        <div className="min-h-[100dvh] grid place-items-center px-4">
            <div className="w-full max-w-sm rounded-2xl border bg-white/5 p-6 backdrop-blur text-white">
                <h1 className="text-xl font-semibold mb-2">Admin login</h1>
                <p className="text-sm text-white/70 mb-6">Wpisz hasło admina, by wejść do panelu.</p>
                <LoginForm/>
            </div>
        </div>
    )
}
