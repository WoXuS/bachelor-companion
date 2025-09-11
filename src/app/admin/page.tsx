import Link from 'next/link'
import { redirect } from 'next/navigation'
import { isAdminServer } from '@/lib/session'
import ParticipantsAdmin from './ParticipantsAdmin'
import { Button } from '@/components/ui/button'

export default function AdminPage() {
    if (!isAdminServer()) redirect('/admin/login')

    const links = [
        { href: '/ranking', label: 'Ranking' },
        { href: '/rewards', label: 'Nagrody' },
        { href: '/tournaments', label: 'Turnieje' },
        { href: '/', label: 'Cennik (home)' },
    ]

    return (
        <div className="max-w-3xl mx-auto p-6 space-y-8">
            <header className="space-y-3">
                <h1 className="text-2xl font-bold">Panel Admina</h1>
                <nav className="grid sm:grid-cols-2 gap-3">
                    {links.map((l) => (
                        <Button asChild key={l.href} variant="secondary" className="justify-start">
                            <Link href={l.href}>{l.label}</Link>
                        </Button>
                    ))}
                </nav>
            </header>

            <section>
                <h2 className="text-xl font-semibold mb-3">Uczestnicy (CRUD)</h2>
                <ParticipantsAdmin />
            </section>
        </div>
    )
}
