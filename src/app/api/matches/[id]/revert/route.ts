import {NextResponse} from 'next/server'
import {prisma} from '@/server/db/prisma'
import {Prisma} from '@prisma/client'
import {errMsg} from "@/lib/error";
import {Ctx, getParams} from "@/types/api";

type Tx = Prisma.TransactionClient

async function revertDPUsageForMatch(tx: Tx, matchId: string) {
    const usages = await tx.participantBuffUsage.findMany({
        where: {matchId},
        select: {participantId: true, used: true, id: true},
    })
    if (!usages.length) return

    const byUser = new Map<string, number>()
    for (const u of usages) byUser.set(u.participantId, (byUser.get(u.participantId) ?? 0) + u.used)

    for (const [participantId, used] of byUser.entries()) {
        await tx.participantBuff.updateMany({
            where: {participantId, type: 'DOUBLE_POINTS'},
            data: {remainingMatches: {increment: used}, active: true},
        })
    }

    await tx.participantBuffUsage.deleteMany({where: {matchId}})
}

export async function POST(_req: Request, ctx: Ctx<{ id: string }>) {
    const {id: matchId} = await getParams(ctx)

    try {
        const result = await prisma.$transaction(async (tx) => {
            const txs = await tx.transaction.findMany({
                where: {matchId},
                select: {id: true, participantId: true, amount: true, isDoubled: true},
            })

            if (txs.length > 0) {
                const deltaByUser = new Map<string, number>()
                for (const t of txs) {
                    deltaByUser.set(t.participantId, (deltaByUser.get(t.participantId) ?? 0) - t.amount)
                }

                const ids = Array.from(deltaByUser.keys())
                const participants = await tx.participant.findMany({
                    where: {id: {in: ids}},
                    select: {id: true, balance: true},
                })
                const balanceById = new Map(participants.map((p) => [p.id, p.balance]))

                for (const [participantId, delta] of deltaByUser.entries()) {
                    const current = balanceById.get(participantId) ?? 0
                    const next = current + delta
                    if (next < 0) {
                        throw new Error(
                            `Nie można cofnąć – saldo uczestnika spadłoby poniżej zera (id=${participantId}).`
                        )
                    }
                }

                for (const [participantId, delta] of deltaByUser.entries()) {
                    if (delta !== 0) {
                        await tx.participant.update({
                            where: {id: participantId},
                            data: {balance: {increment: delta}},
                        })
                    }
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
                        teamBId: true,
                    },
                })
                const downstreamStarted =
                    !!nm?.winnerParticipantId || nm?.scoreA != null || nm?.scoreB != null
                if (!downstreamStarted && nm) {
                    const clear =
                        cur.nextMatchSlot === 'A'
                            ? {participantAId: null, teamAId: null}
                            : {participantBId: null, teamBId: null}
                    await tx.match.update({where: {id: nm.id}, data: clear})
                }
            }

            return m
        })

        return NextResponse.json(result)
    } catch (e: unknown) {
        return NextResponse.json({message: errMsg(e)}, {status: 400})
    }
}
