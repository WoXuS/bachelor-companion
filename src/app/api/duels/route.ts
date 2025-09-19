import { NextResponse } from 'next/server'
import { listDuels } from '@/server/db/repositories/duels.repo'
import { createDuel } from '@/server/db/services/duels.service'

export async function GET() {
    const rows = await listDuels()
    return NextResponse.json(rows)
}

export async function POST(req: Request) {
    const body = await req.json()
    try {
        const d = await createDuel({
            title: String(body.title ?? ''),
            stake: Number(body.stake ?? 0),
            playerAId: String(body.playerAId),
            playerBId: String(body.playerBId),
        })
        return NextResponse.json(d)
    } catch (e: any) {
        return NextResponse.json({ message: e.message }, { status: 400 })
    }
}
