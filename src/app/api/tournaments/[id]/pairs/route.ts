import {NextResponse} from 'next/server'
import {prisma} from '@/server/db/prisma'
import {errMsg} from "@/lib/error";

type Params = { params: { id: string } }

export async function PUT(req: Request, {params}: { params: { id: string } }) {
    const {round = 1, pairs} = await req.json()
    try {
        const editable = await prisma.match.findMany({
            where: {tournamentId: params.id, round: round, bracket: 'WINNERS', isBye: false},
            select: {id: true, winnerParticipantId: true, scoreA: true, scoreB: true}
        })

        const ids = new Set(editable.map(m => m.id))
        const started = editable.some(m => m.winnerParticipantId || m.scoreA != null || m.scoreB != null)
        if (started) return NextResponse.json({message: 'Runda 0 rozpoczęta, edycja zablokowana'}, {status: 400})

        for (const p of pairs) if (!ids.has(p.matchId)) {
            return NextResponse.json({message: 'Nie można edytować meczu (auto-awans)'}, {status: 400})
        }

        const seen = new Set<string>()
        for (const p of pairs) {
            for (const x of [p.participantAId, p.participantBId]) {
                if (!x) continue
                if (seen.has(x)) return NextResponse.json({message: 'Ten sam uczestnik w wielu slotach'}, {status: 400})
                seen.add(x)
            }
        }

        await Promise.all(
            pairs.map((p: {
                participantAId: string | null,
                participantBId: string | null,
                scoreA: number | null,
                scoreB: number | null,
                winnerParticipantId: string | null,
                matchId: string,
            }) => prisma.match.update({
                where: {id: p.matchId},
                data: {
                    participantAId: p.participantAId ?? null,
                    participantBId: p.participantBId ?? null,
                    scoreA: null, scoreB: null, winnerParticipantId: null
                }
            }))
        )

        return NextResponse.json({ok: true})
    } catch (e: unknown) {
        return NextResponse.json({message: errMsg(e)}, {status: 400})
    }
}

