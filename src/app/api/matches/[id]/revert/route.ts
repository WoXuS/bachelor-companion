import {NextResponse} from 'next/server'
import {prisma} from '@/server/db/prisma'

type Params = { params: { id: string } }

export async function POST(req: Request, {params}: Params) {
    return prisma.$transaction(async (tx) => {

        const txs = await tx.transaction.findMany({
            where: {matchId: params.id},
            select: {id: true, participantId: true, amount: true},
        })

        if (txs.length) {
            const deltaByUser = new Map<string, number>()
            for (const t of txs) {
                deltaByUser.set(t.participantId, (deltaByUser.get(t.participantId) ?? 0) - t.amount)
            }
            for (const [participantId, delta] of deltaByUser.entries()) {
                await tx.participant.update({
                    where: {id: participantId},
                    data: {balance: {increment: delta}},
                })
            }

            await tx.transaction.deleteMany({where: {matchId: params.id}})
        }

        const m = await tx.match.update({
            where: {id: params.id},
            data: {
                winnerParticipantId: null,
                winnerTeamId: null,
                scoreA: null,
                scoreB: null,
            },
        })

        const child = await tx.match.findFirst({
            where: {nextMatchId: params.id},
            select: {id: true},
        })

        const cur = await tx.match.findUnique({
            where: {id: params.id},
            select: {nextMatchId: true, nextMatchSlot: true, winnerParticipantId: true},
        })
        if (cur?.nextMatchId && cur.nextMatchSlot) {
            const nm = await tx.match.findUnique({
                where: {id: cur.nextMatchId},
                select: {
                    id: true,
                    winnerParticipantId: true,
                    participantAId: true,
                    participantBId: true,
                    scoreA: true,
                    scoreB: true
                },
            })
            const downstreamStarted = !!nm?.winnerParticipantId || nm?.scoreA != null || nm?.scoreB != null
            if (!downstreamStarted && nm) {
                const clear = cur.nextMatchSlot === 'A' ? {participantAId: null} : {participantBId: null}
                await tx.match.update({where: {id: nm.id}, data: clear})
            }
        }

        return NextResponse.json(m)
    })
}
