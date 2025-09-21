import Link from 'next/link'
import { redirect } from 'next/navigation'
import { isAdminServer } from '@/lib/session'
import ParticipantsAdmin from './ParticipantsAdmin'
import { Button } from '@/components/ui/button'
import {ArrowRightLeft, Award, BanknoteArrowUp, NotepadText} from "lucide-react";
import {Ranking} from "@/components/icons/Ranking";
import {Tournament} from "@/components/icons/Tournament";
import React from "react";

export default function AdminPage() {
    if (!isAdminServer()) redirect('/admin/login')

    const links = [
        {href: '/', icon: <NotepadText size="32"/>, label: 'Cennik (home)'},
        {href: '/ranking', icon: <Ranking size="32"/>, label: 'Ranking'},
        {href: '/transactions', icon: <ArrowRightLeft size="32"/>, label: 'Historia punktów'},
        {href: '/tournaments', icon: <Tournament size="32"/>, label: 'Turnieje'},
        {href: '/how-to-earn', icon: <BanknoteArrowUp size="32"/>, label: 'Jak zarabiać dollary'},
    ]
    return (
        <div className="max-w-3xl mx-auto p-6 space-y-8 pt-20">
            <header className="space-y-3">
                <h1 className="text-2xl font-bold">Panel Admina</h1>
                <nav className="grid sm:grid-cols-2 gap-3">
                    {links.map((l) => (
                        <Button asChild key={l.href} variant="secondary" className="justify-start">
                            <Link href={l.href}>
                                {l.icon}
                                {l.label}
                            </Link>
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
