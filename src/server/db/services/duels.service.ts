import {prisma} from '../prisma'
import {addTransaction} from './economy.service'

export async function createDuel(params: {
    title: string
    stake: number
    playerAId: string
    playerBId: string
}) {
    const {title, stake, playerAId, playerBId} = params
    if (playerAId === playerBId) throw new Error('Ten sam gracz po obu stronach')
    return prisma.duel.create({data: {title, stake, playerAId, playerBId}})
}

export async function reportDuel(params: { id: string; winner: 'A' | 'B'; scoreA?: number; scoreB?: number }) {
    const {id, winner, scoreA, scoreB} = params
    return prisma.$transaction(async (tx) => {
        const d = await tx.duel.findUnique({where: {id}})
        if (!d) throw new Error('Pojedynek nie znaleziony')
        if (d.winnerId) throw new Error('Pojedynek już rozstrzygnięty')

        const winnerId = winner === 'A' ? d.playerAId : d.playerBId
        const loserId = winner === 'A' ? d.playerBId : d.playerAId

        const loser = await tx.participant.findUnique({where: {id: loserId}, select: {balance: true}})
        if (!loser) throw new Error('Uczestnik nie znaleziony')
        if (loser.balance < d.stake) throw new Error('Przegrany nie ma wystarczających środków')

        await tx.duel.update({
            where: {id},
            data: {winnerId, scoreA: scoreA ?? null, scoreB: scoreB ?? null, finishedAt: new Date()},
        })

        await addTransaction(winnerId, d.stake, `Wygrana 1v1: ${d.title}`, id)
        await addTransaction(loserId, -d.stake, `Przegrana 1v1: ${d.title}`, id)
        return true
    })
}


export async function revertDuel(id: string) {
    return prisma.$transaction(async (tx) => {
        const d = await tx.duel.findUnique({where: {id}})
        if (!d) throw new Error('Pojedynek nie znaleziony')

        const txs = await tx.transaction.findMany({
            where: {matchId: id}, // używamy matchId również dla dueli – jest już w Transaction
            select: {participantId: true, amount: true},
        })

        if (txs.length) {
            const deltaByUser = new Map<string, number>()
            for (const t of txs) deltaByUser.set(t.participantId, (deltaByUser.get(t.participantId) ?? 0) - t.amount)
            for (const [participantId, delta] of deltaByUser.entries()) {
                await tx.participant.update({where: {id: participantId}, data: {balance: {increment: delta}}})
            }
            await tx.transaction.deleteMany({where: {matchId: id}})
        }

        await tx.duel.update({
            where: {id},
            data: {winnerId: null, scoreA: null, scoreB: null, finishedAt: null},
        })

        return true
    })
}
