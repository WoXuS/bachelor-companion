'use client'

import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { QRCodeSVG } from 'qrcode.react'
import {apiGet} from '@/lib/api-client'

type Egg = { id: string; code: string; number: number; type: 'PHYSICAL'|'VIRTUAL'; active: boolean; label?: string|null }

const LOGO_URL = '/images/easter-egg.png'
const LOGO_SIZE = 56
const CANONICAL_BASE = process.env.NEXT_PUBLIC_CANONICAL_BASE ?? 'http://localhost:3000'

function useRefMap<T extends Element>() {
    const mapRef = React.useRef(new Map<string, T | null>())
    const setRef = React.useCallback((key: string) => (el: T | null) => {
        mapRef.current.set(key, el)
    }, [])
    return { get: (key: string) => mapRef.current.get(key) ?? null, setRef }
}

function downloadText(filename: string, text: string, type = 'image/svg+xml;charset=utf-8') {
    const blob = new Blob([text], { type })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
}

async function svgToPng(svgEl: SVGSVGElement, filename: string, px = 512) {
    const xml = new XMLSerializer().serializeToString(svgEl)
    const svg64 = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(xml)
    const img = new Image()
    img.crossOrigin = 'anonymous'
    const done = await new Promise<HTMLCanvasElement>((resolve, reject) => {
        img.onload = () => {
            const c = document.createElement('canvas')
            c.width = px
            c.height = px
            const ctx = c.getContext('2d')!
            ctx.drawImage(img, 0, 0, px, px)
            resolve(c)
        }
        img.onerror = reject
        img.src = svg64
    })
    done.toBlob((blob) => {
        if (!blob) return
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = filename
        a.click()
        URL.revokeObjectURL(url)
    }, 'image/png')
}

export default function EggQrPage() {
    const { data: eggs = [] } = useQuery({ queryKey: ['eggs'], queryFn: fetchEggs })
    const svgRefs = useRefMap<SVGSVGElement>()

    const physical = eggs
        .filter(e => e.type === 'PHYSICAL')
        .sort((a, b) => a.number - b.number)

    return (
        <div className="mx-auto max-w-6xl p-6 pt-20">
            <h1 className="mb-4 text-2xl font-bold">QR kody – jajka fizyczne</h1>

            <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4">
                {physical.map(e => {
                    const url = `${CANONICAL_BASE}/easter-egg/${e.code ?? e.id}`
                    const fileBase = `egg-${e.number}`
                    return (
                        <div key={e.id} className="flex flex-col items-center gap-3 rounded-lg border bg-white/5 p-3">
                            <div className="relative">
                                <QRCodeSVG
                                    ref={svgRefs.setRef(e.id)}
                                    value={url}
                                    size={220}
                                    level="H"
                                    includeMargin
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

                            <div className="flex gap-2">
                                <button
                                    className="rounded-md border px-2 py-1 text-xs"
                                    onClick={() => {
                                        const svg = svgRefs.get(e.id)
                                        if (!svg) return
                                        const xml = new XMLSerializer().serializeToString(svg)
                                        downloadText(`${fileBase}.svg`, xml)
                                    }}
                                >
                                    Pobierz SVG
                                </button>
                                <button
                                    className="rounded-md border px-2 py-1 text-xs"
                                    onClick={() => {
                                        const svg = svgRefs.get(e.id)
                                        if (!svg) return
                                        svgToPng(svg, `${fileBase}.png`, 1024)
                                    }}
                                >
                                    Pobierz PNG
                                </button>
                            </div>
                        </div>
                    )
                })}
            </div>

            <div className="mt-4 text-sm text-muted-foreground">
                Podgląd używa kanonicznej domeny: <span className="font-mono">{CANONICAL_BASE}</span>
            </div>
        </div>
    )
}

const fetchEggs = () => apiGet<Egg[]>('/api/easter-eggs')
