'use client'

import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { QRCodeCanvas } from 'qrcode.react'

type Egg = { id: string; code: string; number: number; type: 'PHYSICAL'|'VIRTUAL'; active: boolean; label?: string|null }

const LOGO_URL = '/images/easter-egg.png' // <- podmień
const LOGO_SIZE = 56

async function fetchEggs(): Promise<Egg[]> {
    const r = await fetch('/api/easter-eggs', { cache: 'no-store' })
    const d = await r.json()
    if (!r.ok) throw new Error(d?.message || 'Load failed')
    return d
}

export default function EggQrPage() {
    const { data: eggs = [] } = useQuery({ queryKey: ['eggs'], queryFn: fetchEggs })

    const base =
        (typeof window !== 'undefined' ? window.location.origin : '') ||
        process.env.NEXT_PUBLIC_BASE_URL ||
        'https://kawalerski.wozniakkamil.com'

    const physical = eggs
        .filter(e => e.type === 'PHYSICAL')
        .sort((a, b) => a.number - b.number)

    return (
        <div className="mx-auto max-w-6xl p-6 pt-20">
            <h1 className="mb-4 text-2xl font-bold">QR kody – jajka fizyczne</h1>

            <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4">
                {physical.map(e => {
                    const url = `${base}/easter-egg/${e.code ?? e.id}`
                    return (
                        <div key={e.id} className="flex flex-col items-center gap-3 rounded-lg border bg-white/5 p-3">
                            <div className="relative">
                                <QRCodeCanvas
                                    value={url}
                                    size={220}
                                    level="H"
                                    imageSettings={{
                                        src: LOGO_URL,
                                        height: LOGO_SIZE,
                                        width: LOGO_SIZE,
                                        excavate: true,
                                    }}
                                />
                                <span className="absolute -right-2 -top-2 select-none rounded-md bg-black/85 px-2 py-1 text-xs font-bold text-white shadow">
                  #{e.number}
                </span>
                            </div>

                            <div className="text-center">
                                <p className="font-semibold">Egg #{e.number}</p>
                                {e.label && <p className="text-xs text-muted-foreground">{e.label}</p>}
                                <p className="break-all font-mono text-xs">{url}</p>
                            </div>
                        </div>
                    )
                })}
            </div>

            <div className="mt-4 text-sm text-muted-foreground">
                Podgląd używa domeny: <span className="font-mono">{base}</span>
            </div>
        </div>
    )
}
