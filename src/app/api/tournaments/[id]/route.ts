import {NextResponse} from 'next/server'
import {getTournament, deleteTournament} from '@/server/db/repositories/tournaments.repo'
import {tournamentStarted} from '@/server/db/repositories/tournaments.repo'
import {prisma} from '@/server/db/prisma'
import {errMsg} from "@/lib/error";

type Params = { params: { id: string } }

export async function GET(_: Request, {params}: Params) {
    const t = await getTournament(params.id)
    if (!t) return NextResponse.json({message: 'Not found'}, {status: 404})
    return NextResponse.json(t)
}


type UpdateTournamentBasicsRequest = {
    title?: unknown
    mainPrize?: unknown
    matchWinPrize?: unknown
    consolationPrize?: unknown
}

type UpdateTournamentBasicsData = Partial<
    Pick<
        import('@prisma/client').Tournament,
        'title' | 'mainPrize' | 'matchWinPrize' | 'consolationPrize'
    >
>

export async function PUT(req: Request, {params}: Params) {
    const body = (await req.json()) as UpdateTournamentBasicsRequest

    try {
        const started = await tournamentStarted(params.id)

        const data: UpdateTournamentBasicsData = {}

        if (typeof body.title !== 'undefined') {
            data.title = String(body.title)
        }

        if (typeof body.mainPrize !== 'undefined') {
            const n = Number(body.mainPrize)
            if (!Number.isFinite(n) || !Number.isInteger(n) || n < 0) {
                return NextResponse.json({message: 'Invalid mainPrize'}, {status: 400})
            }
            data.mainPrize = n
        }

        if (!started) {
            if (typeof body.matchWinPrize !== 'undefined') {
                const n = Number(body.matchWinPrize)
                if (!Number.isFinite(n) || !Number.isInteger(n) || n < 0) {
                    return NextResponse.json({message: 'Invalid matchWinPrize'}, {status: 400})
                }
                data.matchWinPrize = n
            }

            if (typeof body.consolationPrize !== 'undefined') {
                const n = Number(body.consolationPrize)
                if (!Number.isFinite(n) || !Number.isInteger(n) || n < 0) {
                    return NextResponse.json({message: 'Invalid consolationPrize'}, {status: 400})
                }
                data.consolationPrize = n
            }
        }

        const updated = await prisma.tournament.update({
            where: {id: params.id},
            data,
        })

        return NextResponse.json(updated)
    } catch (e: unknown) {
        return NextResponse.json({message: errMsg(e)}, {status: 400})
    }
}

export async function DELETE(_: Request, {params}: Params) {
    try {
        const res = await deleteTournament(params.id)
        return NextResponse.json(res)
    } catch (e: unknown) {
        return NextResponse.json({message: errMsg(e)}, {status: 400})
    }
}
