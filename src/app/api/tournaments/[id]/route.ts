import { NextResponse } from 'next/server'
import { getTournament, deleteTournament } from '@/server/db/repositories/tournaments.repo'
import { tournamentStarted } from '@/server/db/repositories/tournaments.repo'
import { prisma } from '@/server/db/prisma'

type Params = { params: { id: string } }

export async function GET(_: Request, { params }: Params) {
    const t = await getTournament(params.id)
    if (!t) return NextResponse.json({ message: 'Not found' }, { status: 404 })
    return NextResponse.json(t)
}

export async function PUT(req: Request, { params }: Params) {
    const body = await req.json()
    try {
        const started = await tournamentStarted(params.id)

        const data: any = {}
        if (typeof body.title !== 'undefined') data.title = String(body.title)
        if (typeof body.mainPrize !== 'undefined') data.mainPrize = Number(body.mainPrize)

        if (!started) {
            if (typeof body.matchWinPrize !== 'undefined') data.matchWinPrize = Number(body.matchWinPrize)
            if (typeof body.consolationPrize !== 'undefined') data.consolationPrize = Number(body.consolationPrize)
        }

        const updated = await prisma.tournament.update({ where: { id: params.id }, data })
        return NextResponse.json(updated)
    } catch (e: any) {
        return NextResponse.json({ message: e.message }, { status: 400 })
    }
}

export async function DELETE(_: Request, { params }: Params) {
    await deleteTournament(params.id)
    return NextResponse.json({ ok: true })
}
