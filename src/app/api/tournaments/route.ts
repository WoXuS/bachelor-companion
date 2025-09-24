import {NextResponse} from 'next/server'
import {listTournaments} from '@/server/db/repositories/tournaments.repo'
import {createSoloTournamentCompact, createTeamTournament} from '@/server/db/services/tournaments.service'
import {errMsg} from "@/lib/error";

export async function GET() {
    const rows = await listTournaments()
    return NextResponse.json(rows)
}

export async function POST(req: Request) {
    const body = await req.json()
    try {
        if (body.type === 'SOLO') {
            const t = await createSoloTournamentCompact({
                title: body.title,
                mainPrize: Number(body.mainPrize),
                matchWinPrize: Number(body.matchWinPrize),
                consolationPrize: Number(body.consolationPrize),
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
    } catch (e: unknown) {
        return NextResponse.json({ message: errMsg(e) }, {status: 400})
    }
}
