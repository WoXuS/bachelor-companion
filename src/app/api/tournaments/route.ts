import {NextResponse} from 'next/server'
import {listTournaments} from '@/server/db/repositories/tournaments.repo'
import {createSoloTournament, createTeamTournament} from '@/server/db/services/tournaments.service'

export async function GET() {
    const rows = await listTournaments()
    return NextResponse.json(rows)
}

export async function POST(req: Request) {
    const body = await req.json()
    try {
        if (body.type === 'SOLO') {
            const t = await createSoloTournament({
                title: body.title,
                mainPrize: Number(body.mainPrize),
                matchWinPrize: Number(body.matchWinPrize),
                participantIds: body.participantIds,
            })
            return NextResponse.json(t)
        } else {
            const t = await createTeamTournament({
                title: body.title,
                mainPrize: Number(body.mainPrize),
                matchWinPrize: Number(body.matchWinPrize),
                teamA: body.teamA,
                teamB: body.teamB,
            })
            return NextResponse.json(t)
        }
    } catch (e: any) {
        return NextResponse.json({message: e.message}, {status: 400})
    }
}
