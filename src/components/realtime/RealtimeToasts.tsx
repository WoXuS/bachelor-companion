'use client'

import {useEffect, useRef} from 'react'
import Pusher from 'pusher-js'
import {toast} from 'sonner'
import {EggClaimedEvent} from "@/server/realtime/pusher";

export default function RealtimeToasts() {
    const pusherRef = useRef<Pusher | null>(null)

    useEffect(() => {
        const key = process.env.NEXT_PUBLIC_PUSHER_KEY
        const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'eu'
        if (key) {
            const p = new Pusher(key, {cluster, forceTLS: true})
            pusherRef.current = p

            const ch = p.subscribe('eggs')
            const handler = (data: EggClaimedEvent) => {
                const kind = data.type === 'PHYSICAL' ? 'fizyczne' : 'wirtualne'
                toast.success(`${data.participantName} znalazł ${kind} jajko. Pozostało aktywnych jajek: ${data.counts?.remaining} z ${data.counts?.total} ${kind}`)
            }
            ch.bind('egg-claimed', handler)

            return () => {
                ch.unbind('egg-claimed', handler)
                p.unsubscribe('eggs')
                p.disconnect()
            }
        }
    }, [])

    return null
}
