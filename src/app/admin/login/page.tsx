import {redirect} from 'next/navigation'
import LoginForm from '@/components/auth/LoginForm'
import {isAdminServer} from '@/lib/session'
import VirtualEggButton from '@/components/easter-egg/VirtualEggButton'
import DemoLoginButton from '@/components/auth/DemoLoginButton'
import {isDemoMode} from '@/lib/demo'

export const dynamic = 'force-dynamic'

export default async function AdminLoginPage() {
    const isAdmin = await isAdminServer()
    if (isAdmin) redirect('/admin')

    return (
        <div className="min-h-[100dvh] grid place-items-center px-4">
            <div className="w-full max-w-sm rounded-2xl border bg-white/5 p-6 backdrop-blur text-white">
                <h1 className="text-xl font-semibold mb-2">Admin login</h1>
                <p className="text-sm text-white/70 mb-6">Wpisz hasło admina, by wejść do panelu.</p>
                <LoginForm/>
                {isDemoMode() && <DemoLoginButton/>}
                <VirtualEggButton placementKey="admin-page" className="mx-auto mt-5"/>
            </div>
            <VirtualEggButton placementKey="admin-page-2" className="ml-300 absolute bottom-0 "/>
        </div>
    )
}
