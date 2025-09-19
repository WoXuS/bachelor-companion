'use client'
import * as React from 'react'
import {DuelDto} from '@/types/duel'

export function DuelHeader({ duel }: { duel: DuelDto }) {
    const status = duel.winnerId ? 'Zakończony' : 'W toku'
    return (
        <header className="flex flex-wrap items-center justify-between gap-3">
            <div>
                <h1 className="text-2xl font-bold">{duel.title}</h1>
                <div className="text-sm text-gray-400">
                    Stawka: {duel.stake} — Status: {status}
                </div>
            </div>
        </header>
    )
}
