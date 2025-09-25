import PusherServer from 'pusher'

export const pusherServer = new PusherServer({
    appId: process.env.PUSHER_APP_ID!,
    key: process.env.PUSHER_KEY!,
    secret: process.env.PUSHER_SECRET!,
    cluster: process.env.PUSHER_CLUSTER!,
    useTLS: process.env.PUSHER_USE_TLS !== 'false',
})

export type EggClaimedEvent = {
    type: 'PHYSICAL' | 'VIRTUAL'
    number: number
    label?: string | null
    participantName: string
    claimedAt: string
    counts?: { total: number; remaining: number }
}

export async function publishEggClaimed(evt: EggClaimedEvent) {
    await pusherServer.trigger('eggs', 'egg-claimed', evt)
}
