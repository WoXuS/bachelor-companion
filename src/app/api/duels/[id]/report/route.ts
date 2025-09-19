import { NextResponse } from 'next/server'
import { reportDuel, revertDuel } from '@/server/db/services/duels.service'

type Params = { params: { id: string } }

export async function POST(req: Request, { params }: Params) {
    const body = await req.json()
    try {
        await reportDuel({
            id: params.id,
            winner: body.winner === 'A' ? 'A' : 'B',
            scoreA: body.scoreA != null ? Number(body.scoreA) : undefined,
            scoreB: body.scoreB != null ? Number(body.scoreB) : undefined,
        })
        return NextResponse.json({ ok: true })
    } catch (e: any) {
        return NextResponse.json({ message: e.message }, { status: 400 })
    }
}

export async function DELETE(_: Request, { params }: Params) {
    try {
        await revertDuel(params.id)
        return NextResponse.json({ ok: true })
    } catch (e: any) {
        return NextResponse.json({ message: e.message }, { status: 400 })
    }
}
