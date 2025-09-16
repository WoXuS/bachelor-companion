import { NextResponse } from 'next/server'
import { prisma } from '@/server/db/prisma'

type Params = { params: { id: string } }

export async function PUT(req: Request, { params }: Params) {
    const { pairs } = await req.json()
    try {
        const matches = await prisma.match.findMany({
            where: { tournamentId: params.id, round: 1 },
            select: { id: true, winnerParticipantId: true, winnerTeamId: true },
        })
        const locked = matches.some(m => m.winnerParticipantId || m.winnerTeamId)
        if (locked) return NextResponse.json({ message: 'Runda rozpoczęta, edycja zablokowana' }, { status: 400 })

        await Promise.all(
            pairs.map((p: any) =>
                prisma.match.update({
                    where: { id: p.matchId },
                    data: {
                        participantAId: p.participantAId ?? null,
                        participantBId: p.participantBId ?? null,
                        isBye: !p.participantAId || !p.participantBId,
                    },
                })
            )
        )
        return NextResponse.json({ ok: true })
    } catch (e: any) {
        return NextResponse.json({ message: e.message }, { status: 400 })
    }
}
