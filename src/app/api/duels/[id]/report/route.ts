import { NextRequest, NextResponse } from 'next/server'
import { reportDuel, revertDuel } from '@/server/db/services/duels.service'

const toNum = (v: unknown) => (v == null ? undefined : Number(v))

export async function POST(
    req: NextRequest,
    ctx: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await ctx.params
        const body = await req.json()
        const winner = body?.winner === 'A' ? 'A' : body?.winner === 'B' ? 'B' : null
        if (!winner) {
            return NextResponse.json({ message: 'Invalid winner' }, { status: 400 })
        }

        await reportDuel({
            id,
            winner,
            scoreA: toNum(body?.scoreA),
            scoreB: toNum(body?.scoreB),
        })

        return NextResponse.json({ ok: true })
    } catch (e: any) {
        return NextResponse.json({ message: e.message || 'Report failed' }, { status: 400 })
    }
}

export async function DELETE(
    _req: NextRequest,
    ctx: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await ctx.params
        await revertDuel(id)
        return NextResponse.json({ ok: true })
    } catch (e: any) {
        return NextResponse.json({ message: e.message || 'Revert failed' }, { status: 400 })
    }
}
