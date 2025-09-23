import { redirect } from 'next/navigation'
import { isAdminServer } from '@/lib/session'
import ParticipantsAdmin from './ParticipantsAdmin'
import React from "react";
import EasterEggsAdmin from "@/app/admin/EasterEggsAdmin";

export default function AdminPage() {
    if (!isAdminServer()) redirect('/admin/login')

    return (
        <div className="max-w-3xl mx-auto p-6 space-y-8 pt-20">
            <section>
                <h2 className="mb-3 text-xl font-semibold">Jajka (zarządzanie)</h2>
                <EasterEggsAdmin />
            </section>
            <section>
                <h2 className="text-xl font-semibold mb-3">Uczestnicy (CRUD)</h2>
                <ParticipantsAdmin />
            </section>

        </div>
    )
}
