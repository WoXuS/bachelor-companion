import {NextResponse} from 'next/server'
import {prisma} from '@/server/db/prisma'
import {Prisma} from "@prisma/client";

type Params = { params: { id: string } }

type Tx = Prisma.TransactionClient

async function revertDPUsageForMatch(tx: Tx, matchId: string) {
    const usages = await tx.participantBuffUsage.findMany({
        where: {matchId},
        select: {participantId: true, used: true, id: true},
    })
    if (!usages.length) return

    const byUser = new Map<string, number>()
    for (const u of usages) byUser.set(u.participantId, (byUser.get(u.participantId) ?? 0) + u.used)
console.log(byUser)
    for (const [participantId, used] of byUser.entries()) {
        await tx.participantBuff.updateMany({
            where: {participantId, type: 'DOUBLE_POINTS'},
            data: {remainingMatches: {increment: used}, active: true},
        })
    }

    await tx.participantBuffUsage.deleteMany({where: {matchId}})
}

export async function POST(req: Request, {params}: Params) {
    return prisma.$transaction(async (tx) => {
        const matchId = params.id

        const txs = await tx.transaction.findMany({
            where: {matchId},
            select: {id: true, participantId: true, amount: true, isDoubled: true},
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
            await tx.transaction.deleteMany({where: {matchId}})
        }

        await revertDPUsageForMatch(tx, matchId)

        const m = await tx.match.update({
            where: {id: matchId},
            data: {
                winnerParticipantId: null,
                winnerTeamId: null,
                scoreA: null,
                scoreB: null,
            },
        })

        const cur = await tx.match.findUnique({
            where: {id: matchId},
            select: {nextMatchId: true, nextMatchSlot: true},
        })
        if (cur?.nextMatchId && cur.nextMatchSlot) {
            const nm = await tx.match.findUnique({
                where: {id: cur.nextMatchId},
                select: {
                    id: true,
                    winnerParticipantId: true,
                    scoreA: true,
                    scoreB: true,
                    participantAId: true,
                    participantBId: true,
                    teamAId: true,
                    teamBId: true
                },
            })
            const downstreamStarted = !!nm?.winnerParticipantId || nm?.scoreA != null || nm?.scoreB != null
            if (!downstreamStarted && nm) {
                const clear =
                    cur.nextMatchSlot === 'A'
                        ? {participantAId: null, teamAId: null}
                        : {participantBId: null, teamBId: null}
                await tx.match.update({where: {id: nm.id}, data: clear})
            }
        }

        return NextResponse.json(m)
    })
}
