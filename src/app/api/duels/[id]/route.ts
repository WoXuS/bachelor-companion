import { NextRequest, NextResponse } from 'next/server'
import { getDuel } from '@/server/db/repositories/duels.repo'
import { prisma } from '@/server/db/prisma'
import type { Prisma } from '@prisma/client'

 type Ctx = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, ctx: Ctx) {
    const { id } = await ctx.params
    const d = await getDuel(id)
    if (!d) return NextResponse.json({ message: 'Not found' }, { status: 404 })
    return NextResponse.json(d)
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
    const { id } = await ctx.params
    const body = (await req.json()) as { bestOf?: unknown }
    const bestOf = Number(body.bestOf)
    if (![1, 3, 5].includes(bestOf)) {
        return NextResponse.json({ message: 'Invalid bestOf' }, { status: 400 })
    }
    const m = await prisma.duel.update({ where: { id }, data: { bestOf } })
    return NextResponse.json(m)
}

export async function PUT(req: NextRequest, ctx: Ctx) {
    const { id } = await ctx.params
    const body = (await req.json()) as {
        title?: unknown
        stake?: unknown
        playerAId?: unknown
        playerBId?: unknown
    }
    const duel = await prisma.duel.findUnique({ where: { id } })
    if (!duel) return NextResponse.json({ message: 'Not found' }, { status: 404 })

    const started = (duel.winnerId || duel.scoreA != null || duel.scoreB != null)
    const data: Prisma.DuelUncheckedUpdateInput = {}

    if (typeof body.title === 'string') data.title = body.title.trim()
    if (body.stake !== undefined) {
        const stake = Number(body.stake)
        if (!Number.isFinite(stake) || stake < 0) {
            return NextResponse.json({ message: 'Invalid stake' }, { status: 400 })
        }
        data.stake = stake
    }
    if (!started) {
        if (typeof body.playerAId === 'string') data.playerAId = body.playerAId
        if (typeof body.playerBId === 'string') data.playerBId = body.playerBId
        if (data.playerAId && data.playerBId && data.playerAId === data.playerBId) {
            return NextResponse.json({ message: 'Players must be different' }, { status: 400 })
        }
    }

    const updated = await prisma.duel.update({ where: { id }, data })
    return NextResponse.json(updated)
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
    const { id } = await ctx.params
    try {
        const result = await prisma.$transaction(async (tx) => {
            const txs = await tx.transaction.findMany({
                where: { matchId: id },
                select: { id: true, participantId: true, amount: true },
            })

            const delta = new Map<string, number>()
            for (const t of txs) {
                delta.set(t.participantId, (delta.get(t.participantId) ?? 0) - t.amount)
            }

            for (const [pid, d] of delta.entries()) {
                const p = await tx.participant.findUnique({ where: { id: pid }, select: { balance: true } })
                if (!p) throw new Error('Participant missing')
                if (p.balance + d < 0) {
                    throw new Error(`Nie można cofnąć transakcji – ${p.balance} - ${-d} spowodowałoby saldo < 0`)
                }
            }

            for (const [pid, d] of delta.entries()) {
                if (d !== 0) {
                    await tx.participant.update({ where: { id: pid }, data: { balance: { increment: d } } })
                }
            }

            if (txs.length) {
                await tx.transaction.deleteMany({ where: { matchId: id } })
            }

            await tx.duel.delete({ where: { id } })
            return { ok: true }
        })

        return NextResponse.json(result)
    } catch (e: unknown) {
        return NextResponse.json(
            { message: e instanceof Error ? e.message : 'Delete failed' },
            { status: 400 },
        )
    }
}
