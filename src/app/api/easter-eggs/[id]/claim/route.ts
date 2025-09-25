import { NextResponse } from 'next/server'
import { claimEggById } from '@/server/db/services/easter-eggs.service'
import { errMsg } from '@/lib/error'
import { Ctx, getParams } from '@/types/api'
import { publishEggClaimed } from '@/server/realtime/pusher'

export async function POST(req: Request, ctx: Ctx<{ id: string }>) {
    try {
        const { id } = await getParams(ctx)
        const { participantId } = await req.json()
        if (!participantId) {
            return NextResponse.json({ message: 'Missing participantId' }, { status: 400 })
        }

        const { tx, event } = await claimEggById(id, participantId)

        publishEggClaimed(event).catch((e) => {
            console.error('Failed to publish egg-claimed event', e)
        })

        return NextResponse.json(tx)
    } catch (e: unknown) {
        return NextResponse.json({ message: errMsg(e) }, { status: 400 })
    }
}
