import {NextRequest, NextResponse} from 'next/server'
import {prisma} from '@/server/db/prisma'
import {errMsg} from '@/lib/error'

type Params = { params: { id: string } }

export async function POST(_req: NextRequest, {params}: Params) {
    const duelId = params.id
    try {
        const result = await prisma.$transaction(async (tx) => {
            const txs = await tx.transaction.findMany({
                where: {matchId: duelId},
                select: {id: true, participantId: true, amount: true},
            })

            if (txs.length > 0) {
                const deltaByUser = new Map<string, number>()
                for (const t of txs) {
                    deltaByUser.set(t.participantId, (deltaByUser.get(t.participantId) ?? 0) - t.amount)
                }

                const participants = await tx.participant.findMany({
                    where: {id: {in: Array.from(deltaByUser.keys())}},
                    select: {id: true, balance: true},
                })
                const balanceById = new Map(participants.map((p) => [p.id, p.balance]))

                for (const [participantId, delta] of deltaByUser.entries()) {
                    const current = balanceById.get(participantId) ?? 0
                    const next = current + delta
                    if (next < 0) {
                        throw new Error(`Nie można cofnąć – saldo uczestnika spadłoby poniżej zera (id=${participantId}).`)
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

                await tx.transaction.deleteMany({where: {matchId: duelId}})

                return tx.duel.update({
                    where: {id: duelId},
                    data: {
                        winnerId: null,
                        scoreA: null,
                        scoreB: null,
                        finishedAt: null,
                    },
                })
            }

            return tx.duel.update({
                where: {id: duelId},
                data: {
                    winnerId: null,
                    scoreA: null,
                    scoreB: null,
                    finishedAt: null,
                },
            })
        })

        return NextResponse.json(result)
    } catch (e: unknown) {
        return NextResponse.json({message: errMsg(e)}, {status: 400})
    }
}
