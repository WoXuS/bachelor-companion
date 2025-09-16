import { NextResponse } from 'next/server'
import { getTournament, deleteTournament } from '@/server/db/repositories/tournaments.repo'
import { updateTournamentBasics } from '@/server/db/services/tournaments.service'

type Params = { params: { id: string } }

export async function GET(_: Request, { params }: Params) {
    const t = await getTournament(params.id)
    if (!t) return NextResponse.json({ message: 'Not found' }, { status: 404 })
    return NextResponse.json(t)
}

export async function PUT(req: Request, { params }: Params) {
    const body = await req.json()
    try {
        const updated = await updateTournamentBasics(params.id, {
            title: body.title,
            mainPrize: typeof body.mainPrize !== 'undefined' ? Number(body.mainPrize) : undefined,
            matchWinPrize: typeof body.matchWinPrize !== 'undefined' ? Number(body.matchWinPrize) : undefined,
        })
        return NextResponse.json(updated)
    } catch (e: any) {
        return NextResponse.json({ message: e.message }, { status: 400 })
    }
}

export async function DELETE(_: Request, { params }: Params) {
    await deleteTournament(params.id)
    return NextResponse.json({ ok: true })
}
